/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiTitle,
} from '@elastic/eui';
import { CoreStart } from 'opensearch-dashboards/public';

interface RegisterRepositoryFlyoutProps {
  core: CoreStart;
  dataSourceId?: string;
  onClose: () => void;
  onSuccess: (repoName: string) => void;
}

const RegisterRepositoryFlyout = ({
  core,
  dataSourceId,
  onClose,
  onSuccess,
}: RegisterRepositoryFlyoutProps) => {
  const [repoName, setRepoName] = useState('');
  const [bucket, setBucket] = useState('');
  const [basePath, setBasePath] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [repoNameError, setRepoNameError] = useState('');
  const [bucketError, setBucketError] = useState('');

  const parseErrorReason = (rawResponse: string): string => {
    try {
      const parsed = typeof rawResponse === 'string' ? JSON.parse(rawResponse) : rawResponse;
      const topReason = parsed?.error?.reason;
      if (!topReason) return rawResponse;

      // Collect all reasons from the caused_by chain
      const allReasons: string[] = [topReason];
      let err = parsed?.error?.caused_by;
      while (err) {
        if (err.reason) allReasons.push(err.reason);
        err = err.caused_by;
      }
      const fullChain = allReasons.join(' ');

      // Detect specific error patterns and return user-friendly messages
      if (/credentials|IMDS|access_key|secret_key/i.test(fullChain)) {
        return (
          'AWS credentials are not configured. Add credentials to the OpenSearch keystore ' +
          'using: bin/opensearch-keystore add s3.client.default.access_key and ' +
          'bin/opensearch-keystore add s3.client.default.secret_key, then restart the cluster.'
        );
      }
      if (/load region|region.*provider/i.test(fullChain)) {
        return (
          'AWS region is not configured. Set s3.client.default.region in opensearch.yml ' +
          'and restart the cluster, or set the AWS_REGION environment variable.'
        );
      }
      if (/Access Denied|AccessDenied|403/i.test(fullChain)) {
        return (
          'Access denied. Verify that the IAM credentials have the required S3 permissions ' +
          'for the specified bucket.'
        );
      }
      if (/NoSuchBucket|bucket does not exist/i.test(fullChain)) {
        return 'The specified S3 bucket does not exist. Verify the bucket name and region.';
      }

      // Fallback: show top reason + deepest non-generic cause
      const genericPatterns = /^(Connect timed out|Read timed out|Connection refused|java\.)/i;
      const actionableReason = [...allReasons]
        .slice(1)
        .reverse()
        .find((r) => !genericPatterns.test(r));

      if (actionableReason) {
        return `${topReason}. Caused by: ${actionableReason}`;
      }
      return topReason;
    } catch {
      return rawResponse;
    }
  };

  /**
   * Registers an S3 snapshot repository in OpenSearch.
   *
   * Note: OpenSearch creates the repository metadata before running verification.
   * If verification fails (e.g., bad credentials, missing bucket), we clean up
   * the broken entry to avoid leaving orphaned repositories in the cluster state.
   */
  const onSubmit = async () => {
    let hasError = false;
    if (!repoName.trim()) {
      setRepoNameError('Repository name is required.');
      hasError = true;
    } else {
      setRepoNameError('');
    }
    if (!bucket.trim()) {
      setBucketError('Bucket name is required.');
      hasError = true;
    } else {
      setBucketError('');
    }
    if (hasError) return;

    setIsSubmitting(true);
    try {
      const trimmedName = repoName.trim();
      const settings: Record<string, string> = { bucket: bucket.trim() };
      if (basePath.trim()) settings.base_path = basePath.trim();

      // Check if a repo with this name already exists
      try {
        const existingRepos = await core.http.get('/api/snapshot/repositories', {
          query: { dataSourceId: dataSourceId || '' },
        });
        if (existingRepos.ok && existingRepos.response && trimmedName in existingRepos.response) {
          setRepoNameError(`A repository named "${trimmedName}" already exists.`);
          setIsSubmitting(false);
          return;
        }
      } catch (e) {
        // If we can't check, proceed with registration — OpenSearch will reject duplicates
        console.warn('Unable to check existing repositories:', e);
      }

      const resp = await core.http.put('/api/snapshot/repository', {
        query: { dataSourceId: dataSourceId || '' },
        body: JSON.stringify({
          repository: trimmedName,
          type: 's3',
          settings,
        }),
      });

      if (resp.ok) {
        core.notifications.toasts.addSuccess(`Repository "${trimmedName}" registered.`);
        onSuccess(trimmedName);
        onClose();
      } else {
        // OpenSearch creates the repo metadata entry before verification runs.
        // If verification fails, the broken entry remains — clean it up.
        try {
          await core.http.delete(`/api/snapshot/repository/${encodeURIComponent(trimmedName)}`, {
            query: { dataSourceId: dataSourceId || '' },
          });
        } catch (e) {
          console.warn('Failed to clean up broken repository entry:', e);
        }
        core.notifications.toasts.addDanger(
          `Failed to register repository: ${parseErrorReason(resp.response || 'Unknown error')}`
        );
      }
    } catch (error: any) {
      core.notifications.toasts.addDanger(
        `Failed to register repository: ${
          error.message || error.body?.message || 'Network error occurred'
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <EuiFlyout ownFocus onClose={onClose} size="s">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>Register S3 repository</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFormRow label="Repository name" isInvalid={!!repoNameError} error={repoNameError}>
          <EuiFieldText
            placeholder="my-s3-repository"
            value={repoName}
            onChange={(e) => {
              setRepoName(e.target.value);
              if (repoNameError) setRepoNameError('');
            }}
            isInvalid={!!repoNameError}
            data-test-subj="register-repo-name"
          />
        </EuiFormRow>

        <EuiFormRow label="S3 bucket" isInvalid={!!bucketError} error={bucketError}>
          <EuiFieldText
            placeholder="my-opensearch-snapshots"
            value={bucket}
            onChange={(e) => {
              setBucket(e.target.value);
              if (bucketError) setBucketError('');
            }}
            isInvalid={!!bucketError}
            data-test-subj="register-repo-bucket"
          />
        </EuiFormRow>

        <EuiFormRow
          label="Base path"
          helpText="Optional. The path within the bucket for repository data."
        >
          <EuiFieldText
            placeholder="snapshots"
            value={basePath}
            onChange={(e) => setBasePath(e.target.value)}
            data-test-subj="register-repo-base-path"
          />
        </EuiFormRow>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>Cancel</EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={onSubmit}
              isLoading={isSubmitting}
              data-test-subj="register-repo-submit"
            >
              Register repository
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

// eslint-disable-next-line import/no-default-export
export default RegisterRepositoryFlyout;
