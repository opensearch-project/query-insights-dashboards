import React, { useEffect, useState } from 'react';
import { EuiFlexItem, EuiPanel, EuiTitle, EuiFlexGrid, EuiText, EuiFieldNumber, EuiSelect, EuiFlexGroup, EuiFormRow } from '@elastic/eui';

const Configuration = () => {

  useEffect(() => {
    return () => {
    };
  }, []);

  const timeOptions = [
    { value: 'MINUTES', text: 'Minutes' },
    { value: 'HOURS', text: 'Hours' },
  ];

  const minutesOptions = [
    { value: 'ONE', text: '1' },
    { value: 'FIVE', text: '5' },
    { value: 'TEN', text: '10' },
    { value: 'FIFTEEN', text: '30' },
  ];

  const [topNSize, setTopNSize] = useState('');
  const [windowSize, setWindowSize] = useState('');
  const [time, setTime] = useState(timeOptions[0].value);

  const onTopNSizeChange = (e) => {
    setTopNSize(e.target.value);
  };

  const onWindowSizeChange = (e) => {
    setWindowSize(e.target.value);
  };

  const onTimeChange = (e) => {
    setTime(e.target.value);
  }

  const minutesBox = () => (
    <EuiSelect
      id="minutes"
      required={true}
      options={minutesOptions}
      value={windowSize}
      onChange={(e) => onWindowSizeChange(e)}
    />
  );

  const hoursBox = () => (
    <EuiFieldNumber
      min={1}
      max={24}
      required={true}
      value={windowSize}
      onChange={(e) => onWindowSizeChange(e)}
    />
  );

  let WindowChoice = null;

  if (time === timeOptions[0].value) {
    WindowChoice = minutesBox;
  } else {
    WindowChoice = hoursBox;
  }

  return (
    <EuiFlexItem grow={false} style={{ width: '60%' }}>
      <EuiPanel
        style={{ padding: '20px 20px' }}
      >
        <EuiFlexItem>
          <EuiTitle size="s">
            <EuiText size="s">
              <h2>
                Latency settings
              </h2>
            </EuiText>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGrid columns={2} gutterSize="s" style={{ padding: '15px 0px' }}>
            <EuiFlexItem style={{ padding: '0px 30px 0px 0px' }}>
              <EuiText size="xs">
                <h3>
                  Value of N (count)
                </h3>
              </EuiText>
              <EuiText size="xs" style={{ lineHeight: '22px', padding: '5px 0px' }}>
                Specify the value of N. N is the number of queries to be collected with in the window size.
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow label="latency.top_n_size" helpText="Max allowed limit 100." style={{ padding: '0px 0px 20px' }}>
                <EuiFlexItem>
                  <EuiFieldNumber
                    min={1}
                    max={100}
                    required={true}
                    value={topNSize}
                    onChange={(e) => onTopNSizeChange(e)}
                  />
                </EuiFlexItem>
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem style={{ padding: '0px 30px 0px 0px' }}>
              <EuiText size="xs">
                <h3>
                  Window size
                </h3>
              </EuiText>
              <EuiText size="xs" style={{ lineHeight: '22px', padding: '5px 0px' }}>
                The duration during which the Top N queries are collected.
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow label="latency.window_size" helpText="Max allowed limit 24 hours." style={{ padding: '15px 0px 5px' }}>
                <EuiFlexGroup>
                  <EuiFlexItem style={{ flexDirection: 'row' }}>
                    <WindowChoice/>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiSelect
                      id="timeUnit"
                      required={true}
                      options={timeOptions}
                      value={time}
                      onChange={(e) => onTimeChange(e)}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGrid>
        </EuiFlexItem>
      </EuiPanel>
    </EuiFlexItem>
  );
};

export default Configuration;

