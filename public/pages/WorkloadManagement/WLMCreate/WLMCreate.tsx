/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useContext } from 'react';
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
import { CoreStart, AppMountParameters } from 'opensearch-dashboards/public';
import { DataSourceManagementPluginSetup } from 'src/plugins/data_source_management/public';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../../types';
import { WLM_CREATE, WLM_MAIN } from '../WorkloadManagement';
import { QueryInsightsDataSourceMenu } from '../../../components/DataSourcePicker';
import { DataSourceContext } from '../WorkloadManagement';
import { getDataSourceEnabledUrl } from '../../../utils/datasource-utils';
import { PageHeader } from '../../../components/PageHeader';

export const WLMCreate = ({
  core,
  depsStart,
  params,
  dataSourceManagement,
}: {
  core: CoreStart;
  depsStart: QueryInsightsDashboardsPluginStartDependencies;
  params: AppMountParameters;
  dataSourceManagement?: DataSourceManagementPluginSetup;
}) => {
  const history = useHistory();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [indexWildcard, setIndexWildcard] = useState('');
  // add wild card later
  const [resiliencyMode, setResiliencyMode] = useState<'soft' | 'enforced'>();
  const [cpuThreshold, setCpuThreshold] = useState<number | undefined>(undefined);
  const [memThreshold, setMemThreshold] = useState<number | undefined>(undefined);
  const isFormValid =
    name.trim() !== '' &&
    resiliencyMode?.trim() !== '' &&
    ((cpuThreshold != null && cpuThreshold > 0 && cpuThreshold <= 100) ||
      (memThreshold != null && memThreshold > 0 && memThreshold <= 100));
  const [loading, setLoading] = useState(false);
  const { dataSource, setDataSource } = useContext(DataSourceContext)!;

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
      const resourceLimits: Record<string, number> = {};

      const validCpu = typeof cpuThreshold === 'number' && cpuThreshold > 0 && cpuThreshold <= 100;
      const validMem = typeof memThreshold === 'number' && memThreshold > 0 && memThreshold <= 100;

      if (validCpu) {
        resourceLimits.cpu = cpuThreshold / 100;
      }
      if (validMem) {
        resourceLimits.memory = memThreshold / 100;
      }

      const body: Record<string, any> = {
        name,
        resiliency_mode: resiliencyMode?.toUpperCase(),
      };

      if (Object.keys(resourceLimits).length > 0) {
        body.resource_limits = resourceLimits;
      }

      await core.http.put('/api/_wlm/workload_group', {
        query: { dataSourceId: dataSource.id },
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
        },
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
      <PageHeader
        coreStart={core}
        depsStart={depsStart}
        fallBackComponent={
          <>
            <QueryInsightsDataSourceMenu
              coreStart={core}
              depsStart={depsStart}
              params={params}
              dataSourceManagement={dataSourceManagement}
              setDataSource={setDataSource}
              selectedDataSource={dataSource}
              onManageDataSource={() => {}}
              onSelectedDataSource={() => {
                window.history.replaceState({}, '', getDataSourceEnabledUrl(dataSource).toString());
              }}
              dataSourcePickerReadOnly={false}
            />
          </>
        }
      />
      <EuiTitle size="l">
        <h1>Create workload group</h1>
      </EuiTitle>
      <EuiText color="subdued" size="s">
        Use query groups to manage resource usage in associated queries.{' '}
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
          label="Description (Optional)"
          helpText="Describe the the purpose of the workload group."
        >
          <EuiTextArea
            placeholder="Describe the workload group"
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
          label="Reject queries when CPU usage exceeds"
          isInvalid={cpuThreshold !== undefined && (cpuThreshold <= 0 || cpuThreshold > 100)}
          error="Value must be between 0 and 100"
        >
          <EuiFieldNumber
            value={cpuThreshold}
            onChange={(e) =>
              setCpuThreshold(e.target.value === '' ? undefined : Number(e.target.value))
            }
            append="%"
            min={0}
            max={100}
          />
        </EuiFormRow>

        <EuiSpacer size="m" />

        {/* Memory Usage Limit */}
        <EuiFormRow
          label="Reject queries when memory usage exceeds"
          isInvalid={memThreshold !== undefined && (memThreshold <= 0 || memThreshold > 100)}
          error="Value must be between 0 and 100"
        >
          <EuiFieldNumber
            value={memThreshold}
            onChange={(e) =>
              setMemThreshold(e.target.value === '' ? undefined : Number(e.target.value))
            }
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
