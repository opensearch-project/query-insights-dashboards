/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  EuiTitle,
  EuiSpacer,
  EuiFieldText,
  EuiTextArea,
  EuiFormRow,
  EuiButton,
  EuiPanel,
  EuiRadioGroup,
  EuiFieldNumber,
  EuiText,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { CoreStart } from 'opensearch-dashboards/public';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../../types';
import { WLM_CREATE, WLM_MAIN } from '../WorkloadManagement';

export const WLMCreate = ({
  core,
  depsStart: _depsStart,
}: {
  core: CoreStart;
  depsStart: QueryInsightsDashboardsPluginStartDependencies;
}) => {
  const history = useHistory();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [indexWildcard, setIndexWildcard] = useState('');
  // add wild card later
  const isFormValid = name.trim() !== '';
  const [resiliencyMode, setResiliencyMode] = useState<'soft' | 'enforced'>('soft');
  const [cpuThreshold, setCpuThreshold] = useState(70);
  const [memThreshold, setMemThreshold] = useState(70);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    core.chrome.setBreadcrumbs([
      {
        text: 'Data Administration',
        href: WLM_CREATE,
        onClick: (e) => {
          e.preventDefault();
          history.push(WLM_MAIN);
        },
      },
      { text: `Create` },
    ]);
  }, [core.chrome, history]);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const body = {
        name,
        resource_limits: {
          cpu: cpuThreshold / 100,
          memory: memThreshold / 100,
        },
        resiliency_mode: resiliencyMode.toUpperCase(),
      };

      await core.http.put('/api/_wlm/workload_group', {
        body: JSON.stringify(body),
      });

      core.notifications.toasts.addSuccess(`Workload group "${name}" created successfully.`);
      history.push('/workloadManagement');
    } catch (err) {
      console.error(err);
      core.notifications.toasts.addDanger({
        title: 'Failed to create workload group',
        text: err?.body?.message || 'Something went wrong',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <EuiTitle size="l">
        <h1>Create Workload group</h1>
      </EuiTitle>
      <EuiText color="subdued" size="s">
        Use query groups to manage resource usage on associated queries.{' '}
        <a
          href="https://docs.opensearch.org/docs/latest/tuning-your-cluster/availability-and-recovery/workload-management/wlm-feature-overview/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#0073e6' }}
        >
          Learn more
        </a>
      </EuiText>
      <EuiSpacer size="l" />

      <EuiPanel paddingSize="l">
        <EuiTitle size="m">
          <h2>Overview</h2>
        </EuiTitle>
        <EuiSpacer size="m" />

        <EuiFormRow label="Name" helpText="Specify a unique name that is easy to recognize.">
          <EuiFieldText value={name} onChange={(e) => setName(e.target.value)} />
        </EuiFormRow>

        <EuiFormRow
          label="Description (optional)"
          helpText="Describe the the purpose of the worlload group."
        >
          <EuiTextArea
            placeholder="Describe workload group"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </EuiFormRow>

        {/* For later implementation*/}
        <EuiFormRow label="Index wildcard" helpText="You can use (*) to define a wildcard.">
          <EuiFieldText
            value={indexWildcard}
            placeholder="e.g., security_logs*"
            onChange={(e) => setIndexWildcard(e.target.value)}
          />
        </EuiFormRow>

        <EuiFormRow label="Resiliency mode" helpText="Select resiliency mode.">
          <EuiRadioGroup
            options={[
              { id: 'soft', label: 'Soft' },
              { id: 'enforced', label: 'Enforced' },
            ]}
            idSelected={resiliencyMode}
            onChange={(id) => setResiliencyMode(id as 'soft' | 'enforced')}
          />
        </EuiFormRow>

        {/* CPU Usage Limit */}
        <EuiFormRow
          label="Reject queries when CPU usage is over"
          isInvalid={cpuThreshold <= 0 || cpuThreshold > 100}
          error="Value must be between 0 and 100"
        >
          <EuiFieldNumber
            value={cpuThreshold}
            onChange={(e) => {
              setCpuThreshold(Number(e.target.value));
            }}
            append="%"
            min={0}
            max={100}
          />
        </EuiFormRow>

        <EuiSpacer size="m" />

        {/* Memory Usage Limit */}
        <EuiFormRow
          label="Reject queries when memory usage is over"
          isInvalid={memThreshold <= 0 || memThreshold > 100}
          error="Value must be between 0 and 100"
        >
          <EuiFieldNumber
            value={memThreshold}
            onChange={(e) => {
              setMemThreshold(Number(e.target.value));
            }}
            append="%"
            min={0}
            max={100}
          />
        </EuiFormRow>

        <EuiSpacer size="l" />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <EuiButton onClick={() => history.push('/workloadManagement')} color="success">
            Cancel
          </EuiButton>
          <EuiButton fill onClick={handleCreate} isLoading={loading} disabled={!isFormValid}>
            Create workload group
          </EuiButton>
        </div>
      </EuiPanel>
    </div>
  );
};
