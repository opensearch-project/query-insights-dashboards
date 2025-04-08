/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

describe('WLM Details Page', () => {
  const groupName = `test_group_${Date.now()}`; // Unique name for each run

  before(() => {
    // Clean up existing non-default groups
    cy.request({
      method: 'GET',
      url: '/api/_wlm/query_group',
      headers: { 'osd-xsrf': 'true' },
    }).then((res) => {
      const groups = res.body?.query_groups ?? [];
      groups.forEach((g) => {
        if (g.name !== 'DEFAULT_QUERY_GROUP') {
          cy.request({
            method: 'DELETE',
            url: `/api/_wlm/query_group/${g.name}`,
            headers: { 'osd-xsrf': 'true' },
            failOnStatusCode: false,
          });
        }
      });
    });

    cy.request({
      method: 'PUT',
      url: '/api/_wlm/query_group',
      headers: { 'osd-xsrf': 'true' },
      body: {
        name: groupName,
        resiliency_mode: 'soft',
        resource_limits: {
          cpu: 0.01,
          memory: 0.01,
        },
      },
    });
  });

  beforeEach(() => {
    cy.visit(`/app/workload-management#/wlm-details?name=${groupName}`);
    cy.wait(5000); // wait for data and rendering
  });

  it('should display workload group summary panel', () => {
    cy.contains('Workload group name').should('exist');
    cy.contains('Resiliency mode').should('exist');
    cy.contains('CPU usage limit').should('exist');
    cy.contains('Memory usage limit').should('exist');
    cy.contains(groupName).should('exist');
  });

  it('should switch between tabs', () => {
    cy.get('.euiTab').contains('Settings').click();
    cy.contains('Workload group settings').should('exist');

    // Scroll into view and click Resources tab (force to bypass overlap)
    cy.get('.euiTab').contains('Resources').scrollIntoView().click({ force: true });
    cy.contains('Node ID').should('exist');
  });

  it('should display node resource usage table', () => {
    cy.contains('Node ID').should('exist');
    cy.get('.euiTableRow').should('have.length.greaterThan', 0);
  });

  it('should allow modifying and saving settings', () => {
    cy.get('.euiTab').contains('Settings').click();

    // Modify CPU and memory thresholds
    cy.get('input[type="number"]').first().clear().type('0.5');
    cy.get('input[type="number"]').last().clear().type('0.6');

    // Select "Soft" resiliency mode
    cy.get('label[for="soft"]').click();

    // Save changes
    cy.contains('Apply Changes').click();

    // Confirm success toast appears
    cy.contains(`Saved changes for "${groupName}"`).should('exist');
  });

  it('should show delete modal and cancel', () => {
    cy.contains('Delete').click();
    cy.contains('Delete workload group').should('exist');
    cy.get('button').contains('Cancel').click();
    cy.contains('Delete workload group').should('not.exist');
  });

  it('should delete the workload group successfully', () => {
    cy.contains('Delete').click();
    cy.get('input[placeholder="delete"]').type('delete');
    cy.get('button').contains('Delete').click();

    // Confirm redirected back to WLM main page
    cy.url().should('include', '/workloadManagement');

    // Confirm toast appears
    cy.contains(`Deleted workload group "${groupName}"`).should('exist');
  });
});
