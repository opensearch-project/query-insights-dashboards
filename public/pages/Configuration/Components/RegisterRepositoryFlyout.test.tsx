/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import RegisterRepositoryFlyout from './RegisterRepositoryFlyout';

const mockOnClose = jest.fn();
const mockOnSuccess = jest.fn();
const mockAddSuccess = jest.fn();
const mockAddDanger = jest.fn();

const createMockCore = (overrides: Record<string, jest.Mock> = {}) => ({
  http: {
    get: overrides.get || jest.fn().mockResolvedValue({ ok: true, response: {} }),
    put: overrides.put || jest.fn().mockResolvedValue({ ok: true }),
    delete: overrides.delete || jest.fn().mockResolvedValue({ ok: true }),
  },
  notifications: {
    toasts: {
      addSuccess: mockAddSuccess,
      addDanger: mockAddDanger,
    },
  },
});

const renderFlyout = (coreOverrides: Record<string, jest.Mock> = {}) => {
  const core = createMockCore(coreOverrides);
  render(
    <RegisterRepositoryFlyout
      core={core as any}
      dataSourceId="test-ds"
      onClose={mockOnClose}
      onSuccess={mockOnSuccess}
    />
  );
  return core;
};

const fillForm = (repoName: string, bucket: string, basePath = '') => {
  fireEvent.change(screen.getByPlaceholderText('my-s3-repository'), {
    target: { value: repoName },
  });
  fireEvent.change(screen.getByPlaceholderText('my-opensearch-snapshots'), {
    target: { value: bucket },
  });
  if (basePath) {
    fireEvent.change(screen.getByPlaceholderText('snapshots'), {
      target: { value: basePath },
    });
  }
};

describe('RegisterRepositoryFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the flyout with all form fields', () => {
      renderFlyout();
      expect(screen.getByText('Register S3 repository')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('my-s3-repository')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('my-opensearch-snapshots')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('snapshots')).toBeInTheDocument();
      expect(screen.getByText('Register repository')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should call onClose when Cancel is clicked', () => {
      renderFlyout();
      fireEvent.click(screen.getByText('Cancel'));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('should show error when repository name is empty', async () => {
      renderFlyout();
      fillForm('', 'my-bucket');
      fireEvent.click(screen.getByText('Register repository'));
      await waitFor(() => {
        expect(screen.getByText('Repository name is required.')).toBeInTheDocument();
      });
    });

    it('should show error when bucket is empty', async () => {
      renderFlyout();
      fillForm('my-repo', '');
      fireEvent.click(screen.getByText('Register repository'));
      await waitFor(() => {
        expect(screen.getByText('Bucket name is required.')).toBeInTheDocument();
      });
    });

    it('should show errors for both empty fields', async () => {
      renderFlyout();
      fireEvent.click(screen.getByText('Register repository'));
      await waitFor(() => {
        expect(screen.getByText('Repository name is required.')).toBeInTheDocument();
        expect(screen.getByText('Bucket name is required.')).toBeInTheDocument();
      });
    });

    it('should block registration when repo name already exists', async () => {
      const core = renderFlyout({
        get: jest.fn().mockResolvedValue({
          ok: true,
          response: { 'existing-repo': { type: 's3', settings: { bucket: 'b' } } },
        }),
      });
      fillForm('existing-repo', 'my-bucket');
      fireEvent.click(screen.getByText('Register repository'));
      await waitFor(() => {
        expect(
          screen.getByText('A repository named "existing-repo" already exists.')
        ).toBeInTheDocument();
      });
      expect(core.http.put).not.toHaveBeenCalled();
    });
  });

  describe('Successful Registration', () => {
    it('should call onSuccess and onClose on successful registration', async () => {
      renderFlyout({
        get: jest.fn().mockResolvedValue({ ok: true, response: {} }),
        put: jest.fn().mockResolvedValue({ ok: true }),
      });
      fillForm('new-repo', 'my-bucket', 'data/path');
      fireEvent.click(screen.getByText('Register repository'));
      await waitFor(() => {
        expect(mockAddSuccess).toHaveBeenCalledWith('Repository "new-repo" registered.');
        expect(mockOnSuccess).toHaveBeenCalledWith('new-repo');
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should send base_path in settings when provided', async () => {
      const mockPut = jest.fn().mockResolvedValue({ ok: true });
      renderFlyout({
        get: jest.fn().mockResolvedValue({ ok: true, response: {} }),
        put: mockPut,
      });
      fillForm('new-repo', 'my-bucket', 'my/path');
      fireEvent.click(screen.getByText('Register repository'));
      await waitFor(() => {
        expect(mockPut).toHaveBeenCalledWith(
          '/api/snapshot/repository',
          expect.objectContaining({
            body: JSON.stringify({
              repository: 'new-repo',
              type: 's3',
              settings: { bucket: 'my-bucket', base_path: 'my/path' },
            }),
          })
        );
      });
    });

    it('should not send base_path when empty', async () => {
      const mockPut = jest.fn().mockResolvedValue({ ok: true });
      renderFlyout({
        get: jest.fn().mockResolvedValue({ ok: true, response: {} }),
        put: mockPut,
      });
      fillForm('new-repo', 'my-bucket');
      fireEvent.click(screen.getByText('Register repository'));
      await waitFor(() => {
        expect(mockPut).toHaveBeenCalledWith(
          '/api/snapshot/repository',
          expect.objectContaining({
            body: JSON.stringify({
              repository: 'new-repo',
              type: 's3',
              settings: { bucket: 'my-bucket' },
            }),
          })
        );
      });
    });
  });

  describe('Failed Registration', () => {
    it('should show user-friendly error for missing credentials', async () => {
      renderFlyout({
        get: jest.fn().mockResolvedValue({ ok: true, response: {} }),
        put: jest.fn().mockResolvedValue({
          ok: false,
          response: JSON.stringify({
            error: {
              reason: '[repo] path not accessible',
              caused_by: { reason: 'Failed to load credentials from IMDS.' },
            },
          }),
        }),
        delete: jest.fn().mockResolvedValue({ ok: true }),
      });
      fillForm('new-repo', 'my-bucket');
      fireEvent.click(screen.getByText('Register repository'));
      await waitFor(() => {
        expect(mockAddDanger).toHaveBeenCalledWith(
          expect.stringContaining('AWS credentials are not configured')
        );
      });
    });

    it('should show user-friendly error for missing region', async () => {
      renderFlyout({
        get: jest.fn().mockResolvedValue({ ok: true, response: {} }),
        put: jest.fn().mockResolvedValue({
          ok: false,
          response: JSON.stringify({
            error: {
              reason: '[repo] path not accessible',
              caused_by: {
                reason: 'Unable to load region from any of the providers in the chain',
              },
            },
          }),
        }),
        delete: jest.fn().mockResolvedValue({ ok: true }),
      });
      fillForm('new-repo', 'my-bucket');
      fireEvent.click(screen.getByText('Register repository'));
      await waitFor(() => {
        expect(mockAddDanger).toHaveBeenCalledWith(
          expect.stringContaining('AWS region is not configured')
        );
      });
    });

    it('should show user-friendly error for non-existent bucket', async () => {
      renderFlyout({
        get: jest.fn().mockResolvedValue({ ok: true, response: {} }),
        put: jest.fn().mockResolvedValue({
          ok: false,
          response: JSON.stringify({
            error: {
              reason: '[repo] path not accessible',
              caused_by: { reason: 'The specified bucket does not exist' },
            },
          }),
        }),
        delete: jest.fn().mockResolvedValue({ ok: true }),
      });
      fillForm('new-repo', 'bad-bucket');
      fireEvent.click(screen.getByText('Register repository'));
      await waitFor(() => {
        expect(mockAddDanger).toHaveBeenCalledWith(
          expect.stringContaining('S3 bucket does not exist')
        );
      });
    });

    it('should show user-friendly error for access denied', async () => {
      renderFlyout({
        get: jest.fn().mockResolvedValue({ ok: true, response: {} }),
        put: jest.fn().mockResolvedValue({
          ok: false,
          response: JSON.stringify({
            error: {
              reason: '[repo] path not accessible',
              caused_by: { reason: 'Access Denied (Service: S3, Status Code: 403)' },
            },
          }),
        }),
        delete: jest.fn().mockResolvedValue({ ok: true }),
      });
      fillForm('new-repo', 'my-bucket');
      fireEvent.click(screen.getByText('Register repository'));
      await waitFor(() => {
        expect(mockAddDanger).toHaveBeenCalledWith(expect.stringContaining('Access denied'));
      });
    });

    it('should clean up broken repo entry on failed registration', async () => {
      const mockDelete = jest.fn().mockResolvedValue({ ok: true });
      renderFlyout({
        get: jest.fn().mockResolvedValue({ ok: true, response: {} }),
        put: jest.fn().mockResolvedValue({
          ok: false,
          response: JSON.stringify({
            error: { reason: 'verification failed' },
          }),
        }),
        delete: mockDelete,
      });
      fillForm('new-repo', 'my-bucket');
      fireEvent.click(screen.getByText('Register repository'));
      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalledWith(
          '/api/snapshot/repository/new-repo',
          expect.objectContaining({ query: { dataSourceId: 'test-ds' } })
        );
      });
    });

    it('should handle network errors gracefully', async () => {
      renderFlyout({
        get: jest.fn().mockResolvedValue({ ok: true, response: {} }),
        put: jest.fn().mockRejectedValue(new Error('Network error')),
      });
      fillForm('new-repo', 'my-bucket');
      fireEvent.click(screen.getByText('Register repository'));
      await waitFor(() => {
        expect(mockAddDanger).toHaveBeenCalledWith('Failed to register repository: Network error');
      });
    });

    it('should handle errors without message property', async () => {
      renderFlyout({
        get: jest.fn().mockResolvedValue({ ok: true, response: {} }),
        put: jest.fn().mockRejectedValue({ body: { message: 'Server unavailable' } }),
      });
      fillForm('new-repo', 'my-bucket');
      fireEvent.click(screen.getByText('Register repository'));
      await waitFor(() => {
        expect(mockAddDanger).toHaveBeenCalledWith(
          'Failed to register repository: Server unavailable'
        );
      });
    });

    it('should show fallback error with caused_by for unknown errors', async () => {
      renderFlyout({
        get: jest.fn().mockResolvedValue({ ok: true, response: {} }),
        put: jest.fn().mockResolvedValue({
          ok: false,
          response: JSON.stringify({
            error: {
              reason: '[repo] path not accessible',
              caused_by: { reason: 'Some unexpected error from OpenSearch' },
            },
          }),
        }),
        delete: jest.fn().mockResolvedValue({ ok: true }),
      });
      fillForm('new-repo', 'my-bucket');
      fireEvent.click(screen.getByText('Register repository'));
      await waitFor(() => {
        expect(mockAddDanger).toHaveBeenCalledWith(
          'Failed to register repository: [repo] path not accessible. Caused by: Some unexpected error from OpenSearch'
        );
      });
    });

    it('should proceed with registration when duplicate check API fails', async () => {
      const mockPut = jest.fn().mockResolvedValue({ ok: true });
      renderFlyout({
        get: jest.fn().mockRejectedValue(new Error('Network error')),
        put: mockPut,
      });
      fillForm('new-repo', 'my-bucket');
      fireEvent.click(screen.getByText('Register repository'));
      await waitFor(() => {
        expect(mockPut).toHaveBeenCalled();
        expect(mockAddSuccess).toHaveBeenCalledWith('Repository "new-repo" registered.');
      });
    });

    it('should still show error toast when cleanup delete fails', async () => {
      renderFlyout({
        get: jest.fn().mockResolvedValue({ ok: true, response: {} }),
        put: jest.fn().mockResolvedValue({
          ok: false,
          response: JSON.stringify({
            error: { reason: 'verification failed' },
          }),
        }),
        delete: jest.fn().mockRejectedValue(new Error('Delete failed')),
      });
      fillForm('new-repo', 'my-bucket');
      fireEvent.click(screen.getByText('Register repository'));
      await waitFor(() => {
        expect(mockAddDanger).toHaveBeenCalledWith(
          expect.stringContaining('Failed to register repository')
        );
      });
    });

    it('should trim whitespace from inputs before submitting', async () => {
      const mockPut = jest.fn().mockResolvedValue({ ok: true });
      renderFlyout({
        get: jest.fn().mockResolvedValue({ ok: true, response: {} }),
        put: mockPut,
      });
      fillForm('  new-repo  ', '  my-bucket  ', '  my/path  ');
      fireEvent.click(screen.getByText('Register repository'));
      await waitFor(() => {
        expect(mockPut).toHaveBeenCalledWith(
          '/api/snapshot/repository',
          expect.objectContaining({
            body: JSON.stringify({
              repository: 'new-repo',
              type: 's3',
              settings: { bucket: 'my-bucket', base_path: 'my/path' },
            }),
          })
        );
      });
    });

    it('should clear repository name error when user starts typing', async () => {
      renderFlyout();
      fillForm('', 'my-bucket');
      fireEvent.click(screen.getByText('Register repository'));
      await waitFor(() => {
        expect(screen.getByText('Repository name is required.')).toBeInTheDocument();
      });
      fireEvent.change(screen.getByPlaceholderText('my-s3-repository'), {
        target: { value: 'n' },
      });
      await waitFor(() => {
        expect(screen.queryByText('Repository name is required.')).not.toBeInTheDocument();
      });
    });

    it('should clear bucket error when user starts typing', async () => {
      renderFlyout();
      fillForm('my-repo', '');
      fireEvent.click(screen.getByText('Register repository'));
      await waitFor(() => {
        expect(screen.getByText('Bucket name is required.')).toBeInTheDocument();
      });
      fireEvent.change(screen.getByPlaceholderText('my-opensearch-snapshots'), {
        target: { value: 'b' },
      });
      await waitFor(() => {
        expect(screen.queryByText('Bucket name is required.')).not.toBeInTheDocument();
      });
    });

    it('should show loading state while submitting', async () => {
      let resolveRegistration: any;
      const mockPut = jest.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveRegistration = resolve;
        })
      );
      renderFlyout({
        get: jest.fn().mockResolvedValue({ ok: true, response: {} }),
        put: mockPut,
      });
      fillForm('new-repo', 'my-bucket');
      fireEvent.click(screen.getByText('Register repository'));
      // Button should be in loading state
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Register repository/i });
        expect(submitButton).toBeDisabled();
      });
      resolveRegistration({ ok: true });
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should prevent multiple simultaneous submissions', async () => {
      let resolveRegistration: any;
      const mockPut = jest.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveRegistration = resolve;
        })
      );
      renderFlyout({
        get: jest.fn().mockResolvedValue({ ok: true, response: {} }),
        put: mockPut,
      });
      fillForm('new-repo', 'my-bucket');
      // Click submit multiple times rapidly
      const button = screen.getByText('Register repository');
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      // Should only call PUT once
      await waitFor(() => {
        expect(mockPut).toHaveBeenCalledTimes(1);
      });
      resolveRegistration({ ok: true });
    });
  });
});
