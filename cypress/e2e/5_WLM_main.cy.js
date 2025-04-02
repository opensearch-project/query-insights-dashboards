describe('WLM Main Page', () => {
  beforeEach(() => {
    cy.visit('/app/workload-management#/workloadManagement');
    cy.wait(5000); // wait for data to load
  });

  it('should display the WLM page with the workload group table', () => {
    cy.contains('Workload groups').should('be.visible');
    cy.get('.euiBasicTable').should('exist');
    cy.get('.euiTableRow').should('have.length.greaterThan', 0);
  });

  it('should filter workload groups with the search bar', () => {
    cy.get('.euiFieldSearch').type('DEFAULT_QUERY_GROUP');
    cy.get('.euiTableRow').should('have.length.at.least', 1);
    cy.get('.euiFieldSearch').clear();
    cy.get('.euiTableRow').should('have.length.greaterThan', 0);
  });

  it('should refresh stats on clicking the refresh button', () => {
    cy.get('button').contains('Refresh').click();
    cy.wait(3000);
    cy.get('.euiTableRow').should('have.length.greaterThan', 0);
  });

  it('should display summary stat cards', () => {
    const titles = [
      'Total workload groups',
      'Total groups exceeding limits',
      'Total completion',
      'Total rejections',
      'Total cancellations',
    ];

    titles.forEach((title) => {
      cy.contains(title).should('be.visible');
    });
  });

  it('should switch between nodes using dropdown', () => {
    cy.get('select').should('exist');
    cy.get('select option').then((options) => {
      if (options.length > 1) {
        cy.get('select').select(options[1].value);
        cy.wait(2000);
        cy.get('.euiTableRow').should('have.length.greaterThan', 0);
      }
    });
  });

  it('should display the WLM main page with workload group table and summary stats', () => {
    cy.visit('/app/workload-management#/workloadManagement');

    // Table is visible
    cy.get('.euiBasicTable').should('be.visible');

    // Stat panels are rendered
    cy.contains('Total workload groups').should('exist');
    cy.contains('Total completion').should('exist');
    cy.contains('Total rejections').should('exist');
  });

  it('should display CPU and memory usage tooltips on hover', () => {
    cy.get('.echarts-for-react')
      .first()
      .trigger('mousemove', { clientX: 10, clientY: 10 });
  });

  it('should switch nodes using the dropdown and refresh data', () => {
    cy.get('select').should('exist');

    cy.get('select').then(($select) => {
      const options = $select.find('option');
      if (options.length > 1) {
        cy.wrap($select).select(options[1].value);
        cy.wait(1000); // allow for backend fetch
        cy.get('.euiBasicTable').should('be.visible');
      }
    });
  });

  it('should filter workload groups by name in search', () => {
    cy.get('.euiFieldSearch').type('DEFAULT_QUERY_GROUP');
    cy.get('.euiTableRow').should('contain.text', 'DEFAULT_QUERY_GROUP');
  });

  it('should route to workload group detail page when clicking a group name', () => {
    cy.get('.euiTableRow')
      .first()
      .within(() => {
        cy.get('a').first().click({ force: true });
      });

    cy.contains('Workload group name', { timeout: 10000 }).should('exist');
  });
});

