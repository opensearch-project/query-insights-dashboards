/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { EuiCallOut, EuiButton, EuiSpacer } from '@elastic/eui';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error boundary component to catch and display React rendering errors
 * Prevents the entire app from crashing when a component fails
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details for debugging
    console.error('Query Profiler Error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px' }}>
          <EuiCallOut
            title="Something went wrong"
            color="danger"
            iconType="alert"
          >
            <p>
              The Query Profiler encountered an unexpected error. Please try refreshing the page
              or contact support if the problem persists.
            </p>
            {this.state.error && (
              <>
                <EuiSpacer size="s" />
                <details style={{ whiteSpace: 'pre-wrap' }}>
                  <summary>Error details</summary>
                  <p style={{ marginTop: '8px', fontFamily: 'monospace', fontSize: '12px' }}>
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <p style={{ marginTop: '8px', fontFamily: 'monospace', fontSize: '12px' }}>
                      {this.state.errorInfo.componentStack}
                    </p>
                  )}
                </details>
              </>
            )}
            <EuiSpacer size="m" />
            <EuiButton onClick={this.handleReset} color="danger" size="s">
              Try Again
            </EuiButton>
          </EuiCallOut>
        </div>
      );
    }

    return this.props.children;
  }
}
