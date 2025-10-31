/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useContext, useRef } from 'react';
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
  EuiButtonIcon,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { CoreStart, AppMountParameters } from 'opensearch-dashboards/public';
import { DataSourceManagementPluginSetup } from 'src/plugins/data_source_management/public';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../../types';
import { WLM_CREATE, WLM_MAIN } from '../WorkloadManagement';
import { WLMDataSourceMenu } from '../../../components/DataSourcePicker';
import { DataSourceContext } from '../WorkloadManagement';
import { getDataSourceEnabledUrl } from '../../../utils/datasource-utils';
import {
  resolveDataSourceVersion,
  isSecurityAttributesSupported,
} from '../../../utils/datasource-utils';

interface Rule {
  index: string;
  username: string;
  role: string;
}

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
  const [resiliencyMode, setResiliencyMode] = useState<'soft' | 'enforced'>();
  const [cpuThreshold, setCpuThreshold] = useState<number | undefined>();
  const [memThreshold, setMemThreshold] = useState<number | undefined>();
  const [rules, setRules] = useState<Rule[]>([{ index: '', username: '', role: '' }]);
  const [indexErrors, setIndexErrors] = useState<Array<string | null>>([]);
  const [usernameErrors, setUsernameErrors] = useState<Array<string | null>>([]);
  const [roleErrors, setRoleErrors] = useState<Array<string | null>>([]);
  const [loading, setLoading] = useState(false);

  const { dataSource, setDataSource } = useContext(DataSourceContext)!;
  const isMounted = useRef(true);
  const [dsVersion, setDsVersion] = useState<string | undefined>();
  const dataSourceEnabled = !!depsStart?.dataSource?.dataSourceEnabled;
  const showSecurity = !dataSourceEnabled || isSecurityAttributesSupported(dsVersion);

  const isFormValid =
    name.trim() !== '' &&
    resiliencyMode !== undefined &&
    ((cpuThreshold != null && cpuThreshold > 0 && cpuThreshold <= 100) ||
      (memThreshold != null && memThreshold > 0 && memThreshold <= 100)) &&
    indexErrors.every((error) => error === null);

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

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const v = await resolveDataSourceVersion(core, dataSource);
      if (!cancelled) setDsVersion(v);
    })();
    return () => {
      cancelled = true;
    };
  }, [core, dataSource?.id]);

  const splitCSV = (v?: string | null) =>
    (v ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  const handleCreate = async () => {
    setLoading(true);
    const getRuleId = (res: any) => res?._id ?? res?.id;
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

      const res = await core.http.put('/api/_wlm/workload_group', {
        query: { dataSourceId: dataSource.id },
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const groupId = res?._id;
      const currentName = res?.name;
      if (!groupId) throw new Error('Workload group ID missing from response');
      const payloads = (rules ?? [])
        .map((rule) => {
          const indexPattern = splitCSV(rule.index);
          const usernames = splitCSV(rule.username);
          const roles = splitCSV(rule.role);

          const hasIndexes = indexPattern.length > 0;
          const hasUsernames = usernames.length > 0;
          const hasRoles = roles.length > 0;
          if (!hasIndexes && !hasUsernames && !hasRoles) return null;

          return {
            description: (description || '-').trim(),
            ...(hasUsernames || hasRoles
              ? {
                  principal: {
                    ...(hasUsernames ? { username: usernames } : {}),
                    ...(hasRoles ? { role: roles } : {}),
                  },
                }
              : {}),
            ...(hasIndexes ? { index_pattern: indexPattern } : {}),
            workload_group: groupId,
          };
        })
        .filter(Boolean) as Array<Record<string, any>>;

      if (payloads.length === 0) {
        core.notifications.toasts.addSuccess('Workload group created successfully.');
        history.push('/workloadManagement');
        return;
      }
      // 3) Create rules, recording created IDs
      const createdRuleIds: string[] = [];
      try {
        for (const payload of payloads) {
          const resRule = await core.http.put('/api/_rules/workload_group', {
            query: { dataSourceId: dataSource.id },
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' },
          });
          const ruleId = getRuleId(resRule);
          if (!ruleId) throw new Error('Rule ID missing from response');
          createdRuleIds.push(ruleId);
        }

        // 4) Success
        core.notifications.toasts.addSuccess('Workload group and rules created successfully.');
        history.push('/workloadManagement');
        return;
      } catch (ruleErr: any) {
        // 5) Cleanup: delete any rules that were already created
        await Promise.allSettled(
          createdRuleIds.map((id) =>
            core.http.delete(`/api/_rules/workload_group/${id}`, {
              query: { dataSourceId: dataSource.id },
            })
          )
        );

        try {
          await core.http.delete(`/api/_wlm/workload_group/${currentName}`, {
            query: { dataSourceId: dataSource.id },
          });
        } catch (cleanupErr: any) {
          core.notifications.toasts.addDanger({
            title: 'Rule creation failed; group rollback also failed',
            text: cleanupErr?.body?.message || cleanupErr?.message || 'Check server logs.',
          });
        }

        core.notifications.toasts.addDanger({
          title: 'Rule creation failed',
          text:
            ruleErr?.body?.message || ruleErr?.message || 'Rolled back created rules and group.',
        });
        return;
      }
    } catch (err: any) {
      console.error(err);
      core.notifications.toasts.addDanger({
        title: 'Failed to create workload group and rules',
        text: err?.body?.message || err?.message || 'Something went wrong',
      });
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  return (
    <div>
      <WLMDataSourceMenu
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
        dataSourcePickerReadOnly={true}
      />

      <EuiTitle size="l">
        <h1>Create workload group</h1>
      </EuiTitle>
      <EuiText color="subdued" size="s">
        Use workload groups to manage resource usage in associated queries.{' '}
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

        <EuiFormRow>
          <>
            <EuiText size="m" style={{ fontWeight: 600 }}>
              Name
            </EuiText>
            <EuiText size="xs" color="subdued" style={{ marginBottom: 4 }}>
              Specify a unique name that is easy to recognize.
            </EuiText>
            <EuiFieldText
              data-testid="name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </>
        </EuiFormRow>

        <EuiFormRow>
          <>
            <EuiText size="m" style={{ fontWeight: 600 }}>
              Description – Optional
            </EuiText>
            <EuiText size="xs" color="subdued" style={{ marginBottom: 4 }}>
              Describe the purpose of the workload group.
            </EuiText>
            <EuiTextArea
              placeholder="Describe the workload group"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </>
        </EuiFormRow>
      </EuiPanel>

      <EuiSpacer size="l" />

      <EuiPanel paddingSize="l">
        <EuiTitle size="m">
          <h2>Rules</h2>
        </EuiTitle>
        <EuiSpacer size="m" />

        <EuiFormRow>
          <>
            <EuiText size="m" style={{ fontWeight: 600 }}>
              Resiliency mode
            </EuiText>
            <EuiText size="xs" color="subdued" style={{ marginBottom: 4 }}>
              Select a resiliency mode.
            </EuiText>
            <EuiRadioGroup
              options={[
                { id: 'soft', label: 'Soft' },
                { id: 'enforced', label: 'Enforced' },
              ]}
              idSelected={resiliencyMode}
              onChange={(id) => setResiliencyMode(id as 'soft' | 'enforced')}
            />
          </>
        </EuiFormRow>

        <EuiSpacer size="l" />

        {rules.map((rule, idx) => (
          <EuiPanel key={idx} paddingSize="m" style={{ position: 'relative', marginBottom: 16 }}>
            <EuiTitle size="s">
              <h3>Rule {idx + 1}</h3>
            </EuiTitle>

            <EuiText size="s" style={{ marginTop: 8, marginBottom: 16 }}>
              <p>Define your rule using any combination of username, role, or index.</p>
            </EuiText>

            <EuiFormRow isInvalid={Boolean(indexErrors[idx])} error={indexErrors[idx]}>
              <>
                {/* ---- Username / Role (gated by showSecurity) ---- */}
                <div>
                  <EuiText size="m" style={{ fontWeight: 600 }}>
                    Username
                  </EuiText>
                  <EuiFormRow
                    fullWidth
                    isInvalid={Boolean(usernameErrors[idx])}
                    error={usernameErrors[idx] || undefined}
                  >
                    <EuiTextArea
                      data-testid={`username-input-${idx}`}
                      placeholder="Enter username"
                      value={rule.username}
                      onChange={(e) => {
                        const value = e.target.value;

                        const updatedRules = [...rules];
                        const updatedErrors = [...usernameErrors];

                        updatedRules[idx].username = value;
                        updatedErrors[idx] =
                          value.length > 100 ? 'Maximum total length is 100 characters.' : null;

                        setRules(updatedRules);
                        setUsernameErrors(updatedErrors);
                      }}
                      disabled={!showSecurity}
                      isInvalid={Boolean(usernameErrors[idx])}
                    />
                  </EuiFormRow>
                  <EuiText size="xs" color="subdued" style={{ marginBottom: 4 }}>
                    {!showSecurity
                      ? 'Username rules require data source ≥ 3.3.'
                      : 'You can use (,) to add multiple usernames.'}
                  </EuiText>
                </div>

                <div style={{ marginTop: 16 }}>
                  <EuiText size="m" style={{ fontWeight: 600 }}>
                    Role
                  </EuiText>
                  <EuiFormRow
                    fullWidth
                    isInvalid={Boolean(roleErrors[idx])}
                    error={roleErrors[idx] || undefined}
                  >
                    <EuiTextArea
                      data-testid={`role-input-${idx}`}
                      placeholder="Enter role"
                      value={rule.role}
                      onChange={(e) => {
                        const value = e.target.value;

                        const updatedRules = [...rules];
                        const updatedErrors = [...roleErrors];

                        updatedRules[idx].role = value;
                        updatedErrors[idx] =
                          value.length > 100 ? 'Maximum total length is 100 characters.' : null;

                        setRules(updatedRules);
                        setRoleErrors(updatedErrors);
                      }}
                      disabled={!showSecurity}
                      isInvalid={Boolean(roleErrors[idx])}
                    />
                  </EuiFormRow>
                  <EuiText size="xs" color="subdued" style={{ marginBottom: 4 }}>
                    {!showSecurity
                      ? 'Role rules require data source ≥ 3.3.'
                      : 'You can use (,) to add multiple roles.'}
                  </EuiText>
                </div>

                {/* ---- Index (always available) ---- */}
                <div style={{ marginTop: 16 }}>
                  <EuiText size="m" style={{ fontWeight: 600 }}>
                    Index wildcard
                  </EuiText>
                  <EuiSpacer size="s" />
                  <EuiTextArea
                    data-testid="indexInput"
                    placeholder="Enter index"
                    value={rule.index}
                    onChange={(e) => {
                      const value = e.target.value;
                      const commaCount = (value.match(/,/g) || []).length;

                      const updatedRules = [...rules];
                      const updatedErrors = [...indexErrors];

                      updatedRules[idx].index = value;
                      updatedErrors[idx] =
                        commaCount >= 10 ? 'You can specify at most 10 indexes per rule.' : null;

                      setRules(updatedRules);
                      setIndexErrors(updatedErrors);
                    }}
                    isInvalid={Boolean(indexErrors[idx])}
                  />
                  <EuiText size="xs" color="subdued" style={{ marginBottom: 4 }}>
                    You can use (,) to add multiple indexes.
                  </EuiText>
                </div>
              </>
            </EuiFormRow>

            <EuiSpacer size="s" />

            <EuiButtonIcon
              iconType="trash"
              aria-label="Delete rule"
              color="danger"
              onClick={() => setRules(rules.filter((_, i) => i !== idx))}
              style={{ position: 'absolute', top: 12, right: 12 }}
            />
          </EuiPanel>
        ))}

        <EuiButton
          onClick={() => {
            setRules((prev) => [...prev, { index: '', username: '', role: '' }]);
            setIndexErrors((prev) => [...prev, null]);
          }}
          disabled={rules.length >= 5}
        >
          + Add another rule
        </EuiButton>
      </EuiPanel>

      <EuiSpacer size="l" />

      <EuiPanel paddingSize="l">
        <EuiTitle size="m">
          <h2>Resource thresholds</h2>
        </EuiTitle>
        <EuiSpacer size="m" />

        <EuiFormRow
          isInvalid={cpuThreshold !== undefined && (cpuThreshold <= 0 || cpuThreshold > 100)}
          error="Value must be between 0 and 100"
        >
          <>
            <label htmlFor="cpu-threshold-input">
              <EuiText size="m" style={{ fontWeight: 600 }}>
                Reject queries when CPU usage exceeds
              </EuiText>
            </label>
            <EuiFieldNumber
              data-testid="cpu-threshold-input"
              value={cpuThreshold}
              onChange={(e) =>
                setCpuThreshold(e.target.value === '' ? undefined : Number(e.target.value))
              }
              onKeyDown={(e) => {
                if (['e', 'E', '+', '-'].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              append="%"
              min={0}
              max={100}
            />
          </>
        </EuiFormRow>

        <EuiFormRow
          isInvalid={memThreshold !== undefined && (memThreshold <= 0 || memThreshold > 100)}
          error="Value must be between 0 and 100"
        >
          <>
            <label htmlFor="memory-threshold-input">
              <EuiText size="m" style={{ fontWeight: 600 }}>
                Reject queries when memory usage exceeds
              </EuiText>
            </label>
            <EuiFieldNumber
              data-testid="memory-threshold-input"
              value={memThreshold}
              onChange={(e) =>
                setMemThreshold(e.target.value === '' ? undefined : Number(e.target.value))
              }
              onKeyDown={(e) => {
                if (['e', 'E', '+', '-'].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              append="%"
              min={0}
              max={100}
            />
          </>
        </EuiFormRow>
      </EuiPanel>

      <EuiSpacer size="l" />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <EuiButton onClick={() => history.push('/workloadManagement')} color="text">
          Cancel
        </EuiButton>
        <EuiButton fill onClick={handleCreate} isLoading={loading} disabled={!isFormValid}>
          Create workload group
        </EuiButton>
      </div>
    </div>
  );
};
