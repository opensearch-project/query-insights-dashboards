import React, { useState, useEffect } from 'react';
import {
  EuiOverlayMask,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiStat,
  EuiSpacer,
  EuiTitle,
  EuiBasicTable,
  Pagination,
  Criteria,
} from '@elastic/eui';

interface NodeUsageData {
  nodeId: string;
  cpuUsage: number;
  memoryUsage: number;
}

interface QueryGroupDetailsProps {
  queryGroup: string;
  cpuUsageLimit: number;
  memoryUsageLimit: number;
  totalCompletion: number;
  totalRejections: number;
  totalCancellations: number;
  nodeData: NodeUsageData[];
  onClose: () => void;
}

const QueryGroupDetails: React.FC<QueryGroupDetailsProps> = ({
                                                               queryGroup,
                                                               cpuUsageLimit,
                                                               memoryUsageLimit,
                                                               totalCompletion,
                                                               totalRejections,
                                                               totalCancellations,
                                                               nodeData,
                                                               onClose,
                                                             }) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<keyof NodeUsageData>('cpuUsage');
  const [sortedData, setSortedData] = useState<NodeUsageData[]>([]);

  useEffect(() => {
    setSortedData([...nodeData].sort((a, b) => b.cpuUsage - a.cpuUsage));
  }, [nodeData]);

  const onTableChange = (criteria: Criteria<NodeUsageData>) => {
    const { sort, page } = criteria;

    if (sort) {
      const sorted = [...sortedData].sort((a, b) => {
        const valA = a[sort.field];
        const valB = b[sort.field];

        if (typeof valA === 'number' && typeof valB === 'number') {
          return valB - valA;
        }
        return String(valB).localeCompare(String(valA));
      });

      setSortField(sort.field);
      setSortedData(sorted);
    }

    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
  };

  const pagination: Pagination = {
    pageIndex,
    pageSize,
    totalItemCount: sortedData.length,
    pageSizeOptions: [5, 10, 15, 20],
  };

  return (
    <EuiOverlayMask>
      <EuiModal onClose={onClose} style={{ width: 700 }}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>Query group {queryGroup}</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          {/* Summary Statistics */}
          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem>
              <EuiPanel paddingSize="m">
                <EuiStat title={totalCompletion} description="Total completion" />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel paddingSize="m">
                <EuiStat title={totalRejections} description="Total rejections" />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel paddingSize="m">
                <EuiStat title={totalCancellations} description="Total cancellations" />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="l" />

          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem>
              <EuiPanel paddingSize="m">
                <EuiStat title={`${cpuUsageLimit}%`} description="CPU usage limit" />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel paddingSize="m">
                <EuiStat title={`${memoryUsageLimit}%`} description="Memory usage limit" />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="xl" />

          {/* Table for Node Usage */}
          <EuiTitle size="s">
            <h3>Node Resource Usage</h3>
          </EuiTitle>
          <EuiSpacer size="m" />

          <EuiBasicTable<NodeUsageData>
            items={sortedData.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)}
            columns={[
              { field: 'nodeId', name: 'Node ID', sortable: false },
              {
                field: 'cpuUsage',
                name: 'CPU Usage',
                sortable: true,
                render: (cpuUsage: number) => (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span>{cpuUsage}%</span>
                    <div
                      style={{
                        marginLeft: '10px',
                        width: '100px',
                        height: '10px',
                        background: '#ccc',
                        borderRadius: '5px',
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          width: `${cpuUsage}%`,
                          height: '100%',
                          background: 'blue',
                        }}
                      ></div>
                    </div>
                  </div>
                ),
              },
              {
                field: 'memoryUsage',
                name: 'Memory Usage',
                sortable: true,
                render: (memoryUsage: number) => (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span>{memoryUsage}%</span>
                    <div
                      style={{
                        marginLeft: '10px',
                        width: '100px',
                        height: '10px',
                        background: '#ccc',
                        borderRadius: '5px',
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          width: `${memoryUsage}%`,
                          height: '100%',
                          background: memoryUsage > 80 ? 'red' : 'blue',
                        }}
                      ></div>
                    </div>
                  </div>
                ),
              },
            ]}
            sorting={{ sort: { field: sortField, direction: 'desc' } }}
            pagination={pagination}
            onChange={onTableChange}
          />
        </EuiModalBody>
      </EuiModal>
    </EuiOverlayMask>
  );
};

export default QueryGroupDetails;

