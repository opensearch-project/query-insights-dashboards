/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { WLM_AUTH } from '../support/constants';

describe('WLM Details Page', () => {
  const api = (opts) =>
    cy.request({
      headers: { 'osd-xsrf': 'true' },
      auth: WLM_AUTH,
      failOnStatusCode: false,
      ...opts,
    });

  const groupName = `wlm-e2e-${Date.now()}`;

  before(() => {
    // 1) Ensure WLM is enabled
    return (
      cy
        .enableWlmMode(WLM_AUTH)
        // 2) Delete all non-default groups
        .then(() => api({ method: 'GET', url: '/api/_wlm/workload_group' }))
        .then((res) => {
          const groups = res.body?.workload_groups || [];
          groups
            .filter((g) => g.name !== 'DEFAULT_WORKLOAD_GROUP')
            .forEach((g) => {
              api({
                method: 'DELETE',
                url: '/api/_wlm/workload_group/' + encodeURIComponent(g.name),
              });
            });
        })
        // 3) Create the test group
        .then(() =>
          api({
            method: 'PUT',
            url: '/api/_wlm/workload_group',
            body: {
              name: groupName,
              resiliency_mode: 'soft',
              resource_limits: { cpu: 0.01, memory: 0.01 },
            },
          })
        )
        .its('status')
        .should('be.oneOf', [200, 201, 204, 409])
    );
  });

  beforeEach(() => {
    cy.visit(`/app/workload-management#/wlm-details?name=${groupName}`, { auth: WLM_AUTH });
    cy.contains(groupName).should('exist');
  });

  it('should display workload group summary panel', () => {
    cy.contains('Workload group name').should('exist');
    cy.contains('Resiliency mode').should('exist');
    cy.contains('CPU usage limit').should('exist');
    cy.contains('Memory usage limit').should('exist');
  });

  it('should switch between tabs', () => {
    cy.get('[data-testid="wlm-tab-settings"]').click();
    cy.contains('Workload group settings').should('exist');
    cy.get('[data-testid="wlm-tab-resources"]').click();
    cy.contains('Node ID').should('exist');
  });

  it('should display node resource usage table', () => {
    cy.get('[data-testid="wlm-tab-resources"]').click();
    cy.contains('Node ID').should('exist');
    cy.get('.euiTableRow').should('have.length.greaterThan', 0);
  });

  it('should show delete modal', () => {
    cy.contains('Delete').click();
    cy.contains('Delete workload group').should('exist');
    cy.get('.euiModalFooter button').contains('Cancel').click();
  });

  it('should create, update, and delete a username + role + index rule on the details page', () => {
    const u1 = `user_${Date.now()}`;
    const r1 = `role_${Date.now()}`;
    const i1 = `logs-${Date.now()}-*`;

    const u2 = `user_updated`;
    const r2 = `role_updated`;
    const i2 = `metrics-${Date.now()}-*`;

    cy.intercept('PUT', '**/api/_wlm/workload_group/*').as('saveGroup');
    cy.intercept('GET', '**/api/_rules/workload_group*').as('listRules');

    cy.get('[data-testid="wlm-tab-settings"]').click();
    cy.contains('+ Add another rule').click();

    cy.get('textarea[placeholder="Enter username"]').last().type(u1);
    cy.get('textarea[placeholder="Enter role"]').last().type(r1);
    cy.get('textarea[data-testid="indexInput"]').last().type(i1);

    cy.contains('button', /^Apply Changes$/)
      .should('not.be.disabled')
      .click();
    cy.wait('@saveGroup');

    cy.reload();
    cy.wait('@listRules');
    cy.get('[data-testid="wlm-tab-settings"]').click();

    cy.contains(u1, { timeout: 20000 }).should('exist');
    cy.contains(r1, { timeout: 20000 }).should('exist');
    cy.contains(i1, { timeout: 20000 }).should('exist');

    cy.get('textarea[placeholder="Enter username"]')
      .last()
      .type('{selectAll}{backspace}')
      .type(u2)
      .blur();
    cy.get('textarea[placeholder="Enter role"]')
      .last()
      .type('{selectAll}{backspace}')
      .type(r2)
      .blur();
    cy.get('textarea[data-testid="indexInput"]')
      .last()
      .type('{selectAll}{backspace}')
      .type(i2)
      .blur();

    cy.contains('button', /^Apply Changes$/)
      .should('not.be.disabled')
      .click();
    cy.wait('@saveGroup');

    cy.reload();
    cy.wait('@listRules');
    cy.get('[data-testid="wlm-tab-settings"]').click();

    cy.contains(u2, { timeout: 20000 }).should('exist');
    cy.contains(r2, { timeout: 20000 }).should('exist');
    cy.contains(i2, { timeout: 20000 }).should('exist');
    cy.contains(u1).should('not.exist');
    cy.contains(r1).should('not.exist');
    cy.contains(i1).should('not.exist');

    cy.get('button[aria-label="Delete rule"]', { timeout: 20000 }).last().click({ force: true });

    cy.contains('button', /^Apply Changes$/)
      .should('not.be.disabled')
      .click();
    cy.wait('@saveGroup');

    cy.reload();
    cy.wait('@listRules');
    cy.get('[data-testid="wlm-tab-settings"]').click();

    cy.get('textarea[placeholder="Enter username"]').should(($areas) => {
      const values = Array.from($areas, (el) => (el.value || '').trim());
      expect(values).to.not.include(u2);
    });
    cy.get('textarea[placeholder="Enter role"]').should(($areas) => {
      const values = Array.from($areas, (el) => (el.value || '').trim());
      expect(values).to.not.include(r2);
    });
    cy.get('textarea[data-testid="indexInput"]').should(($areas) => {
      const values = Array.from($areas, (el) => (el.value || '').trim());
      expect(values).to.not.include(i2);
    });
  });

  it('should delete the workload group successfully', () => {
    cy.contains('Delete').click();
    cy.get('input[placeholder="delete"]').type('delete');
    cy.get('.euiModalFooter button').contains('Delete').click();
    cy.url().should('include', '/workloadManagement');
    cy.contains(`Deleted workload group "${groupName}"`).should('exist');
  });
});

describe('WLM Details – DEFAULT_WORKLOAD_GROUP', () => {
  before(() => {
    cy.enableWlmMode(WLM_AUTH);
  });

  it('should disable settings tab for DEFAULT_WORKLOAD_GROUP', () => {
    cy.visit('/app/workload-management#/wlm-details?name=DEFAULT_WORKLOAD_GROUP', {
      auth: WLM_AUTH,
    });
    cy.get('[data-testid="wlm-tab-settings"]').click();
    cy.contains('Settings are not available for the DEFAULT_WORKLOAD_GROUP').should('exist');
  });
});
