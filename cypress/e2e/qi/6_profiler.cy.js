/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { BASE_PATH } from '../../support/constants';

const PROFILER_PATH = `${BASE_PATH}/app/dev_tools#/queryProfiler`;

describe('Query Profiler', () => {
  beforeEach(() => {
    cy.visit(PROFILER_PATH);
    cy.contains('Import', { timeout: 30000 }).should('be.visible');
  });

  afterEach(() => {
    cy.get('body').type('{esc}');
  });

  it('renders all tabs', () => {
    cy.contains('.euiTab', 'Settings').should('be.visible');
    cy.contains('.euiTab', 'Import').should('be.visible');
    cy.contains('.euiTab', 'Export JSON').should('be.visible');
    cy.contains('.euiTab', 'Help').should('be.visible');
  });

  it('renders editor panels', () => {
    cy.get('.conApp__editorActionButton--success').should('have.length', 2);
  });

  it('opens settings modal', () => {
    cy.contains('.euiTab', 'Settings').click();
    cy.contains('Query Profiler Settings').should('be.visible');
    cy.contains('Font Size').should('be.visible');
    cy.contains('Wrap long lines').should('be.visible');
    cy.contains('button', 'Cancel').click();
    cy.contains('Query Profiler Settings').should('not.exist');
  });

  it('saves settings', () => {
    cy.contains('.euiTab', 'Settings').click();
    cy.get('input[type="number"]').clear().type('16');
    cy.contains('button', 'Save').click();
    cy.contains('Query Profiler Settings').should('not.exist');
  });

  it('opens import flyout', () => {
    cy.contains('.euiTab', 'Import').click();
    cy.contains('Search query').should('be.visible');
    cy.contains('Profile JSON').should('be.visible');
    cy.contains('button', 'Cancel').click();
    cy.contains('Search query').should('not.exist');
  });

  it('opens help flyout', () => {
    cy.contains('.euiTab', 'Help').click();
    cy.contains('About Query Profiler').should('be.visible');
    cy.contains('Reset All').scrollIntoView().should('be.visible');
  });

  it('executes a search query and returns 200', () => {
    cy.intercept('POST', '**/api/profiler-proxy').as('profilerQuery');
    cy.get('.conApp__editorActionButton--success').first().click();
    cy.wait('@profilerQuery').its('response.statusCode').should('eq', 200);
  });

  it('shows meaningful error for invalid query', () => {
    cy.intercept('POST', '**/api/profiler-proxy', {
      statusCode: 400,
      body: { message: '[illegal_argument_exception] bad parameter' },
    }).as('profilerError');
    cy.get('.conApp__editorActionButton--success').first().click();
    cy.wait('@profilerError');
    cy.get('.ace_content').last().invoke('text').should('include', 'Error');
  });

  it('resets editors when reset button clicked', () => {
    cy.get('.conApp__editorActionButton--success').eq(1).click();
    cy.contains('match_all').should('be.visible');
  });

  it('exports JSON file', () => {
    cy.intercept('POST', '**/api/profiler-proxy').as('profilerQuery');
    cy.get('.conApp__editorActionButton--success').first().click();
    cy.wait('@profilerQuery').its('response.statusCode').should('eq', 200);
    cy.contains('.euiTab', 'Export JSON').click();
    cy.task('deleteFile', 'cypress/downloads/profile.json');
  });

  it('imports search query into editor', () => {
    const query = 'GET _search\n{\n  "query": {\n    "term": { "status": "active" }\n  }\n}';
    cy.contains('.euiTab', 'Import').click();
    cy.contains('Search query').should('be.visible');
    cy.get('input[type="file"]').selectFile(
      { contents: Cypress.Buffer.from(query), fileName: 'test_query.txt', mimeType: 'text/plain' },
      { force: true }
    );
    cy.get('[data-test-subj="importQueriesConfirmBtn"]').should('not.be.disabled').click();
    cy.contains('Search query').should('not.exist');
  });

  it('imports profile JSON into output panel', () => {
    const profile = JSON.stringify({
      profile: { shards: [{ id: '[node1][index][0]', searches: [] }] },
    });
    cy.contains('.euiTab', 'Import').click();
    cy.contains('Profile JSON').click();
    cy.get('input[type="file"]').selectFile(
      {
        contents: Cypress.Buffer.from(profile),
        fileName: 'test_profile.json',
        mimeType: 'application/json',
      },
      { force: true }
    );
    cy.get('[data-test-subj="importQueriesConfirmBtn"]').should('not.be.disabled').click();
    cy.contains('Profile JSON').should('not.exist');
  });
});
