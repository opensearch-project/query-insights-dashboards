
/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

import React, { useState } from 'react';
import { formatDate } from '../../../../../src/services/format';
import { createDataStore } from '../data_store';

import {
  OuiBasicTable,
  OuiHealth,
  OuiIcon,
  OuiLink,
  OuiToolTip,
  OuiFlexGroup,
  OuiFlexItem,
  OuiSwitch,
  OuiSpacer,
  OuiCode,
} from '@opensearch-project/oui';

/*
Example user object:

{
  id: '1',
  firstName: 'john',
  lastName: 'doe',
  github: 'johndoe',
  dateOfBirth: Date.now(),
  nationality: 'NL',
  online: true
}

Example country object:

{
  code: 'NL',
  name: 'Netherlands',
  flag: '🇳🇱'
}
*/

const store = createDataStore();

export const Table = () => {
  const [enableAll, setEnableAll] = useState(false);
  const [readonly, setReadonly] = useState(false);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [sortField, setSortField] = useState('firstName');
  const [sortDirection, setSortDirection] = useState('asc');

  const onTableChange = ({ page = {}, sort = {} }) => {
    const { index: pageIndex, size: pageSize } = page;

    const { field: sortField, direction: sortDirection } = sort;

    setPageIndex(pageIndex);
    setPageSize(pageSize);
    setSortField(sortField);
    setSortDirection(sortDirection);
  };

  const { pageOfItems, totalItemCount } = store.findUsers(
    pageIndex,
    pageSize,
    sortField,
    sortDirection
  );

  const columns = [
    {
      field: 'firstName',
      name: 'First Name',
      sortable: true,
      truncateText: true,
      mobileOptions: {
        render: (item) => (
          <span>
            {item.firstName} {item.lastName}
          </span>
        ),
        header: false,
        truncateText: false,
        enlarge: true,
        fullWidth: true,
      },
    },
    {
      field: 'lastName',
      name: 'Last Name',
      truncateText: true,
      mobileOptions: {
        show: false,
      },
    },
    {
      field: 'github',
      name: (
        <OuiToolTip content="Their mascot is the Octokitty">
          <span>
            Github{' '}
            <OuiIcon
              size="s"
              color="subdued"
              type="questionInCircle"
              className="oui-alignTop"
            />
          </span>
        </OuiToolTip>
      ),
      render: (username) => (
        <OuiLink href="https://oui.opensearch.org/latest/" target="_blank">
          {username}
        </OuiLink>
      ),
    },
    {
      field: 'dateOfBirth',
      name: (
        <OuiToolTip content="Colloquially known as a 'birthday'">
          <span>
            Date of Birth{' '}
            <OuiIcon
              size="s"
              color="subdued"
              type="questionInCircle"
              className="oui-alignTop"
            />
          </span>
        </OuiToolTip>
      ),
      schema: 'date',
      render: (date) => formatDate(date, 'dobLong'),
    },
    {
      field: 'nationality',
      name: (
        <OuiToolTip content="The nation in which this person resides">
          <span>
            Nationality{' '}
            <OuiIcon
              size="s"
              color="subdued"
              type="questionInCircle"
              className="oui-alignTop"
            />
          </span>
        </OuiToolTip>
      ),
      render: (countryCode) => {
        const country = store.getCountry(countryCode);
        return `${country.flag} ${country.name}`;
      },
    },
    {
      field: 'online',
      name: (
        <OuiToolTip content="Free to talk or busy with business">
          <span>
            Online{' '}
            <OuiIcon
              size="s"
              color="subdued"
              type="questionInCircle"
              className="oui-alignTop"
            />
          </span>
        </OuiToolTip>
      ),
      schema: 'boolean',
      render: (online) => {
        const color = online ? 'success' : 'danger';
        const label = online ? 'Online' : 'Offline';
        return <OuiHealth color={color}>{label}</OuiHealth>;
      },
    },
  ];

  const pagination = {
    pageIndex: pageIndex,
    pageSize: pageSize,
    totalItemCount: totalItemCount,
    pageSizeOptions: [3, 5, 8],
  };

  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
    enableAllColumns: enableAll,
    readOnly: readonly,
  };

  return (
    <div>
      <OuiFlexGroup>
        <OuiFlexItem grow={false}>
          <OuiSwitch
            label={<OuiCode>enableAllColumns</OuiCode>}
            checked={enableAll}
            onChange={() => setEnableAll((enabled) => !enabled)}
          />
        </OuiFlexItem>
        <OuiFlexItem grow={false}>
          <OuiSwitch
            label={<OuiCode>readOnly</OuiCode>}
            checked={readonly}
            onChange={() => setReadonly((readonly) => !readonly)}
          />
        </OuiFlexItem>
      </OuiFlexGroup>
      <OuiSpacer />
      <OuiBasicTable
        items={pageOfItems}
        columns={columns}
        pagination={pagination}
        sorting={sorting}
        onChange={onTableChange}
      />
    </div>
  );
};








const testItems = [
  {
    "timestamp" : 1719871061174,
    "task_resource_usages" : [
      {
        "action" : "indices:data/read/search[phase/query]",
        "taskId" : 54,
        "parentTaskId" : 53,
        "nodeId" : "F9Qw4La8RiOZXji7s6WtTw",
        "taskResourceUsage" : {
          "cpu_time_in_nanos" : 15461000,
          "memory_in_bytes" : 2050624
        }
      },
      {
        "action" : "indices:data/read/search",
        "taskId" : 53,
        "parentTaskId" : -1,
        "nodeId" : "F9Qw4La8RiOZXji7s6WtTw",
        "taskResourceUsage" : {
          "cpu_time_in_nanos" : 0,
          "memory_in_bytes" : 0
        }
      }
    ],
    "source" : "{\"size\":1000}",
    "labels" : {
      "X-Opaque-Id" : "cyji-id"
    },
    "search_type" : "query_then_fetch",
    "indices" : [
      "my-index-*"
    ],
    "phase_latency_map" : {
      "expand" : 0,
      "query" : 22,
      "fetch" : 1
    },
    "node_id" : "F9Qw4La8RiOZXji7s6WtTw",
    "total_shards" : 1,
    "latency" : 31,
    "memory" : 2050624,
    "cpu" : 15461000
  },
  {
    "timestamp" : 1719871061236,
    "task_resource_usages" : [
      {
        "action" : "indices:data/read/search[phase/query]",
        "taskId" : 58,
        "parentTaskId" : 57,
        "nodeId" : "F9Qw4La8RiOZXji7s6WtTw",
        "taskResourceUsage" : {
          "cpu_time_in_nanos" : 6625000,
          "memory_in_bytes" : 818120
        }
      },
      {
        "action" : "indices:data/read/search",
        "taskId" : 57,
        "parentTaskId" : -1,
        "nodeId" : "F9Qw4La8RiOZXji7s6WtTw",
        "taskResourceUsage" : {
          "cpu_time_in_nanos" : 0,
          "memory_in_bytes" : 0
        }
      }
    ],
    "source" : "{\"size\":20,\"query\":{\"bool\":{\"must\":[{\"match_phrase\":{\"message\":{\"query\":\"document\",\"slop\":0,\"zero_terms_query\":\"NONE\",\"boost\":1.0}}},{\"match\":{\"user.id\":{\"query\":\"cyji\",\"operator\":\"OR\",\"prefix_length\":0,\"max_expansions\":50,\"fuzzy_transpositions\":true,\"lenient\":false,\"zero_terms_query\":\"NONE\",\"auto_generate_synonyms_phrase_query\":true,\"boost\":1.0}}}],\"adjust_pure_negative\":true,\"boost\":1.0}}}",
    "labels" : { },
    "search_type" : "query_then_fetch",
    "indices" : [
      "my-index-0"
    ],
    "phase_latency_map" : {
      "expand" : 0,
      "query" : 16,
      "fetch" : 0
    },
    "node_id" : "F9Qw4La8RiOZXji7s6WtTw",
    "total_shards" : 1,
    "latency" : 17,
    "memory" : 818120,
    "cpu" : 6625000
  },
  {
    "timestamp" : 1719871061197,
    "task_resource_usages" : [
      {
        "action" : "indices:data/read/search[phase/query]",
        "taskId" : 56,
        "parentTaskId" : 55,
        "nodeId" : "F9Qw4La8RiOZXji7s6WtTw",
        "taskResourceUsage" : {
          "cpu_time_in_nanos" : 2824000,
          "memory_in_bytes" : 288328
        }
      },
      {
        "action" : "indices:data/read/search",
        "taskId" : 55,
        "parentTaskId" : -1,
        "nodeId" : "F9Qw4La8RiOZXji7s6WtTw",
        "taskResourceUsage" : {
          "cpu_time_in_nanos" : 0,
          "memory_in_bytes" : 0
        }
      }
    ],
    "source" : "{\"size\":20,\"query\":{\"term\":{\"user.id\":{\"value\":\"cyji\",\"boost\":1.0}}}}",
    "labels" : { },
    "search_type" : "query_then_fetch",
    "indices" : [
      "my-index-0"
    ],
    "phase_latency_map" : {
      "expand" : 0,
      "query" : 4,
      "fetch" : 0
    },
    "node_id" : "F9Qw4La8RiOZXji7s6WtTw",
    "total_shards" : 3,
    "latency" : 4,
    "memory" : 288328,
    "cpu" : 2824000
  },
  {
    "timestamp" : 1719871061255,
    "task_resource_usages" : [
      {
        "action" : "indices:data/read/search[phase/query]",
        "taskId" : 60,
        "parentTaskId" : 59,
        "nodeId" : "F9Qw4La8RiOZXji7s6WtTw",
        "taskResourceUsage" : {
          "cpu_time_in_nanos" : 805000,
          "memory_in_bytes" : 66680
        }
      },
      {
        "action" : "indices:data/read/search[phase/query]",
        "taskId" : 60,
        "parentTaskId" : 59,
        "nodeId" : "F9Qw4La8RiOZXji7s6WtTw",
        "taskResourceUsage" : {
          "cpu_time_in_nanos" : 805000,
          "memory_in_bytes" : 66680
        }
      },
      {
        "action" : "indices:data/read/search",
        "taskId" : 59,
        "parentTaskId" : -1,
        "nodeId" : "F9Qw4La8RiOZXji7s6WtTw",
        "taskResourceUsage" : {
          "cpu_time_in_nanos" : 0,
          "memory_in_bytes" : 0
        }
      }
    ],
    "source" : "{\"from\":0,\"size\":10,\"query\":{\"match_all\":{\"boost\":1.0}},\"sort\":[{\"user.age\":{\"order\":\"desc\"}}]}",
    "labels" : { },
    "search_type" : "query_then_fetch",
    "indices" : [
      "my-index-0",
      "my-index-1",
    ],
    "phase_latency_map" : { },
    "node_id" : "F9Qw4La8RiOZXji7s6WtTw",
    "total_shards" : 1,
    "latency" : 2,
    "memory" : 133360,
    "cpu" : 1610000
  },
  {
    "timestamp" : 1711059060452,
    "node_id" : "qaZrSOygTjmu2C9P8yw9AQ",
    "total_shards" : 1,
    "phase_latency_map" : {
      "expand" : 1,
      "query" : 2,
      "fetch" : 10
    },
    "search_type" : "query_then_fetch",
    "indices" : [
      "my-index-0"
    ],
    "source" : "{\"query\":{\"range\":{\"user.age\":{\"from\":50,\"to\":null,\"include_lower\":false,\"include_upper\":true,\"boost\":1.0}}}}",
    "latency" : 14,
    "cpu": 240,
    "memory": 30,
  }
];
