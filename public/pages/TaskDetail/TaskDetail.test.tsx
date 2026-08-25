/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppMountParameters, CoreStart } from 'opensearch-dashboards/public';
import '@testing-library/jest-dom';
import { retrieveLiveQueries } from '../../../common/utils/QueryUtils';
import { LiveSearchQueryResponse } from '../../../types/types';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../types';
import { DataSourceContext } from '../TopNQueries/TopNQueries';
import TaskDetail from './TaskDetail';

jest.mock('../../../common/utils/QueryUtils', () => ({
  retrieveLiveQueries: jest.fn(),
}));

const makeCore = (): CoreStart =>
  ({
    chrome: {
      setBreadcrumbs: jest.fn(),
    },
    http: {
      post: jest.fn(),
    },
    savedObjects: {
      client: {},
    },
    uiSettings: {
      get: jest.fn().mockReturnValue(false),
    },
  }) as unknown as CoreStart;

const liveTask = {
  id: 'live-task:1',
  status: 'running',
  start_time: 1640995200000,
  total_latency_millis: 500,
  total_cpu_nanos: 1000000,
  total_memory_bytes: 2048,
  coordinator_task: {
    task_id: 'live-task:1',
    node_id: 'node-a',
    action: 'indices:data/read/search',
    status: 'running',
    description: 'source[{"query":{"match_all":{}}}]',
    start_time: 1640995200000,
    running_time_nanos: 500000000,
    cpu_nanos: 1000000,
    memory_bytes: 2048,
  },
  shard_tasks: [],
};

const finishedTask = {
  id: 'finished-task:1',
  timestamp: 1640995200000,
  measurements: {
    latency: { number: 500000000, count: 1, aggregationType: 'NONE' },
    cpu: { number: 1000000, count: 1, aggregationType: 'NONE' },
    memory: { number: 2048, count: 1, aggregationType: 'NONE' },
  },
  total_shards: 1,
  node_id: 'node-a',
  source: '',
  source_truncated: false,
  labels: {},
  search_type: 'query_then_fetch',
  indices: ['test-index'],
  phase_latency_map: {},
  task_resource_usages: [],
  group_by: 'NONE',
  status: 'completed',
  top_n_id: 'top-n-query:1',
};

const taskDetailWithDataSource = (core: CoreStart, dataSourceId: string, taskId: string) => (
  <MemoryRouter initialEntries={[`/task-detail?taskId=${encodeURIComponent(taskId)}`]}>
    <DataSourceContext.Provider
      value={{
        dataSource: { id: dataSourceId, label: dataSourceId },
        setDataSource: jest.fn(),
      }}
    >
      <TaskDetail
        core={core}
        depsStart={{} as unknown as QueryInsightsDashboardsPluginStartDependencies}
        params={{} as AppMountParameters}
        dataSourceManagement={undefined}
      />
    </DataSourceContext.Provider>
  </MemoryRouter>
);

const createDeferred = <T,>() => {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
};

describe('TaskDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a live task when the user has permission', async () => {
    (retrieveLiveQueries as jest.MockedFunction<typeof retrieveLiveQueries>).mockResolvedValue({
      ok: true,
      response: { live_queries: [liveTask] },
    });

    render(taskDetailWithDataSource(makeCore(), 'source-a', liveTask.id));

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Task Summary' })
    ).toBeInTheDocument();
    expect(screen.getByText('Kill Query')).toBeInTheDocument();
    expect(screen.getAllByText('node-a')).toHaveLength(2);
    expect(screen.queryByText('Task not found')).not.toBeInTheDocument();
  });

  it('renders a completed task when the user has permission', async () => {
    (retrieveLiveQueries as jest.MockedFunction<typeof retrieveLiveQueries>).mockResolvedValue({
      ok: true,
      response: { live_queries: [], finished_queries: [finishedTask] },
    });

    render(taskDetailWithDataSource(makeCore(), 'source-a', finishedTask.id));

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Task Summary (Completed)' })
    ).toBeInTheDocument();
    expect(screen.getByText('View Top N')).toBeInTheDocument();
    expect(screen.queryByText('Kill Query')).not.toBeInTheDocument();
    expect(screen.queryByText('Task not found')).not.toBeInTheDocument();
  });

  it('preserves the not-found state for an authorized empty response', async () => {
    (retrieveLiveQueries as jest.MockedFunction<typeof retrieveLiveQueries>).mockResolvedValue({
      ok: true,
      response: { live_queries: [], finished_queries: [] },
    });

    render(taskDetailWithDataSource(makeCore(), 'source-a', 'missing-task'));

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Task not found' })
    ).toBeInTheDocument();
    expect(
      screen.queryByText("You don't have permission to view Query Insights data.")
    ).not.toBeInTheDocument();
  });

  it('shows an access-denied message instead of task not found for a forbidden response', async () => {
    (retrieveLiveQueries as jest.MockedFunction<typeof retrieveLiveQueries>).mockRejectedValue({
      statusCode: 403,
      body: {
        message: '[security_exception] no permissions for live queries',
      },
    });

    const { container } = render(
      taskDetailWithDataSource(makeCore(), 'source-a', 'restricted-task')
    );

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: "You don't have permission to view Query Insights data.",
      })
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-test-subj="taskDetailsAccessDenied"]')
    ).toBeInTheDocument();
    expect(screen.queryByText('Task not found')).not.toBeInTheDocument();
  });

  it('ignores a forbidden response from a previously selected data source', async () => {
    const sourceARequest = createDeferred<LiveSearchQueryResponse>();
    const sourceBRequest = createDeferred<LiveSearchQueryResponse>();
    (retrieveLiveQueries as jest.MockedFunction<typeof retrieveLiveQueries>).mockImplementation(
      (_core, dataSourceId) =>
        dataSourceId === 'source-a' ? sourceARequest.promise : sourceBRequest.promise
    );

    const core = makeCore();
    const { rerender } = render(taskDetailWithDataSource(core, 'source-a', liveTask.id));
    await waitFor(() =>
      expect(retrieveLiveQueries).toHaveBeenCalledWith(core, 'source-a', undefined, true)
    );

    rerender(taskDetailWithDataSource(core, 'source-b', liveTask.id));
    await waitFor(() =>
      expect(retrieveLiveQueries).toHaveBeenCalledWith(core, 'source-b', undefined, true)
    );

    await act(async () => {
      sourceARequest.reject({ statusCode: 403 });
      await Promise.resolve();
    });
    expect(
      screen.queryByText("You don't have permission to view Query Insights data.")
    ).not.toBeInTheDocument();

    await act(async () => {
      sourceBRequest.resolve({
        ok: true,
        response: { live_queries: [liveTask], finished_queries: [] },
      });
      await Promise.resolve();
    });
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Task Summary' })
    ).toBeInTheDocument();
  });

  it('keeps the initial task request active when the MDS picker initializes', async () => {
    const taskRequest = createDeferred<LiveSearchQueryResponse>();
    (retrieveLiveQueries as jest.MockedFunction<typeof retrieveLiveQueries>).mockReturnValue(
      taskRequest.promise
    );
    const InitializingDataSourceMenu = ({ componentConfig }: any) => {
      React.useEffect(() => {
        componentConfig.onSelectedDataSources([{ id: 'source-a', label: 'Source A' }]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    };
    const dataSourceManagement = {
      ui: {
        getDataSourceMenu: jest.fn().mockReturnValue(InitializingDataSourceMenu),
      },
    };
    const core = makeCore();

    render(
      <MemoryRouter initialEntries={[`/task-detail?taskId=${encodeURIComponent(liveTask.id)}`]}>
        <DataSourceContext.Provider
          value={{
            dataSource: { id: 'source-a', label: 'Source A' },
            setDataSource: jest.fn(),
          }}
        >
          <TaskDetail
            core={core}
            depsStart={
              {
                dataSource: { dataSourceEnabled: true },
              } as unknown as QueryInsightsDashboardsPluginStartDependencies
            }
            params={{ setHeaderActionMenu: jest.fn() } as unknown as AppMountParameters}
            dataSourceManagement={dataSourceManagement as any}
          />
        </DataSourceContext.Provider>
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(retrieveLiveQueries).toHaveBeenCalledWith(core, 'source-a', undefined, true)
    );
    await act(async () => {
      taskRequest.resolve({
        ok: true,
        response: { live_queries: [liveTask], finished_queries: [] },
      });
      await Promise.resolve();
    });

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Task Summary' })
    ).toBeInTheDocument();
    expect(retrieveLiveQueries).toHaveBeenCalledTimes(1);
  });
});
