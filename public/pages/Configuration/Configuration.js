import React, { useEffect, useState } from 'react';
import { EuiFlexItem, EuiPanel, EuiTitle, EuiFlexGrid, EuiText, EuiFieldNumber, EuiSelect, EuiFlexGroup, EuiFormRow, EuiForm, EuiButton, EuiButtonEmpty, EuiBottomBar } from '@elastic/eui';
import { useHistory } from 'react-router-dom';

const Configuration = () => {

  useEffect(() => {
    return () => {
    };
  }, []);

  const timeUnits = [
    { value: 'MINUTES', text: 'Minute(s)' },
    { value: 'HOURS', text: 'Hour(s)' },
  ];

  const minutesOptions = [
    { value: 'ONE', text: '1' },
    { value: 'FIVE', text: '5' },
    { value: 'TEN', text: '10' },
    { value: 'THIRTY', text: '30' },
  ];

  const defaultTopN = '10';
  const defaultWindowSize = minutesOptions[3].value;
  const defaultTimeUnit = timeUnits[0].value;

  const history = useHistory();

  const [topNSize, setTopNSize] = useState(defaultTopN);
  const [windowSize, setWindowSize] = useState(defaultWindowSize);
  const [time, setTime] = useState(defaultTimeUnit);

  const onTopNSizeChange = (e) => {
    setTopNSize(e.target.value);
  };

  const onWindowSizeChange = (e) => {
    setWindowSize(e.target.value);
  };

  const onTimeChange = (e) => {
    setTime(e.target.value);
  }

  const MinutesBox = () => (
    <EuiSelect
      id="minutes"
      required={true}
      options={minutesOptions}
      value={windowSize}
      onChange={(e) => onWindowSizeChange(e)}
    />
  );

  const HoursBox = () => (
    <EuiFieldNumber
      min={1}
      max={24}
      required={true}
      value={windowSize}
      onChange={(e) => onWindowSizeChange(e)}
    />
  );

  let WindowChoice = (time === timeUnits[0].value) ? MinutesBox : HoursBox;

  let changed = (topNSize !== defaultTopN) ? 'topN': (windowSize !== defaultWindowSize) ? 'windowSize' : null;

  let valid = false;
  if (1 <= topNSize && topNSize <= 100) {
    if (time === timeUnits[0].value) {
      valid = true;
    } else {
      if (1 <= windowSize && windowSize <= 24) {
        valid = true;
      }
    }
  }

  const reset = () => {
    setTopNSize(defaultTopN);
    setWindowSize(defaultWindowSize);
    setTime(defaultTimeUnit);
  };

  return (
    <div>
      <EuiFlexItem grow={false} style={{ width: '60%' }}>
        <EuiPanel style={{ padding: '20px 20px' }} >
          <EuiForm>
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
                          options={timeUnits}
                          value={time}
                          onChange={(e) => onTimeChange(e)}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGrid>
            </EuiFlexItem>
          </EuiForm>
        </EuiPanel>
      </EuiFlexItem>
      {(changed && valid) ? (
        <EuiBottomBar>
          <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                color="ghost"
                size="s"
                iconType="cross"
                onClick={reset}
              >
                Cancel
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton color="primary" fill size="s" iconType="check" onClick={() => history.push('/queryInsights')}>
                Save
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiBottomBar>
      ) : null}
    </div>
  );
};

export default Configuration;


