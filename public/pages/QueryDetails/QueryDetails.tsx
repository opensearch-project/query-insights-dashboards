import React, { useEffect } from 'react';
import Plotly from 'plotly.js-dist';
import {
  EuiButton,
  EuiCodeBlock,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import hash from 'object-hash';
import { useParams, useHistory, useLocation } from 'react-router-dom';
import { CoreStart } from '../../../../../src/core/public';
import QuerySummary from './Components/QuerySummary';
import { QUERY_INSIGHTS } from '../TopNQueries/TopNQueries';

const QueryDetails = ({ queries, core }: { queries: any; core: CoreStart }) => {
  const { hashedQuery } = useParams<{ hashedQuery: string }>();
  const query = queries.find((q: any) => hash(q) === hashedQuery);

  const convertTime = (unixTime: number) => {
    const date = new Date(unixTime);
    const loc = date.toDateString().split(' ');
    return loc[1] + ' ' + loc[2] + ', ' + loc[3] + ' @ ' + date.toLocaleTimeString('en-US');
  };

  const history = useHistory();
  const location = useLocation();

  useEffect(() => {
    core.chrome.setBreadcrumbs([
      {
        text: 'Query insights',
        href: QUERY_INSIGHTS,
        onClick: (e) => {
          e.preventDefault();
          history.push(QUERY_INSIGHTS);
        },
      },
      { text: `Query details: ${convertTime(query.timestamp)}` },
    ]);
  }, [core.chrome, history, location, query.timestamp]);

  useEffect(() => {
    let x: number[] = Object.values(query.phase_latency_map);
    if (x.length < 3) {
      x = [0, 0, 0];
    }
    const data = [
      {
        x: x.reverse(),
        y: ['Fetch    ', 'Query    ', 'Expand    '],
        type: 'bar',
        orientation: 'h',
        width: 0.5,
        marker: { color: ['#F990C0', '#1BA9F5', '#7DE2D1'] },
        base: [x[2] + x[1], x[2], 0],
        text: x.map((value) => `${value}ms`),
        textposition: 'outside',
        cliponaxis: false,
      },
    ];
    const layout = {
      autosize: true,
      margin: { l: 80, r: 80, t: 25, b: 15, pad: 0 },
      autorange: true,
      height: 120,
      xaxis: {
        side: 'top',
        zeroline: false,
        ticksuffix: 'ms',
        autorangeoptions: { clipmin: 0 },
        tickfont: { color: '#535966' },
        linecolor: '#D4DAE5',
        gridcolor: '#D4DAE5',
      },
      yaxis: { linecolor: '#D4DAE5' },
    };
    const config = { responsive: true };
    Plotly.newPlot('latency', data, layout, config);
  }, [query]);

  const queryString = JSON.stringify(JSON.parse(JSON.stringify(query.source)), null, 2);
  const queryDisplay = `{\n  "query": ${queryString ? queryString.replace(/\n/g, '\n  ') : ''}\n}`;

  return (
    <div>
      <EuiTitle size="l">
        <h1>Query details</h1>
      </EuiTitle>
      <EuiSpacer size="l" />
      <EuiFlexItem>
        <QuerySummary query={query} />
        <EuiSpacer size="m" />
        <EuiFlexGrid columns={2}>
          <EuiFlexItem grow={1}>
            <EuiPanel>
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                <EuiFlexItem>
                  <EuiText size="xs">
                    <h2>Query</h2>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    iconSide="right"
                    iconType="popout"
                    target="_blank"
                    href="https://playground.opensearch.org/app/searchRelevance#/"
                  >
                    Open in search comparision
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiHorizontalRule margin="xs" />
              <EuiSpacer size="xs" />
              <EuiCodeBlock
                language="jsx"
                paddingSize="m"
                fontSize="s"
                overflowHeight={600}
                isCopyable
              >
                {queryDisplay}
              </EuiCodeBlock>
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem grow={1} style={{ alignSelf: 'start' }}>
            <EuiPanel>
              <EuiText size="xs">
                <h2>Latency</h2>
              </EuiText>
              <EuiHorizontalRule margin="m" />
              <div id="latency" />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGrid>
      </EuiFlexItem>
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default QueryDetails;
