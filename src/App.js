import React, { useState, useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import { signOut as amplifySignOut } from '@aws-amplify/auth';
import '@aws-amplify/ui-react/styles.css';
import './App.css';
import { sourceConfig, targetConfig } from './services/amplify-config';
import { executeSourceQuery, executeTargetQuery, executeTargetMutation } from './services/api-service';
import { listOwners, listUnits, listPayments } from './graphql/sourceQueries';

function App() {
  // Workflow state
  const [workflowStep, setWorkflowStep] = useState('source-login');

  // Data state
  const [sourceData, setSourceData] = useState({
    owners: [],
    units: [],
    payments: []
  });

  const [targetData, setTargetData] = useState({
    profiles: [],
    properties: [],
    payments: []
  });

  // Logs
  const [logs, setLogs] = useState([]);

  // Configure Amplify based on the current workflow step
  useEffect(() => {
    if (workflowStep.startsWith('source')) {
      Amplify.configure(sourceConfig);
    } else if (workflowStep.startsWith('target')) {
      Amplify.configure(targetConfig);
    }
  }, [workflowStep]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prevLogs => [...prevLogs, { message, type, timestamp }]);
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      addLog('Signing out...');
      await amplifySignOut();
      addLog('Signed out successfully', 'success');

      // If we're signing out from source, move to target login
      if (workflowStep === 'source-logout') {
        setWorkflowStep('target-login');
      } else {
        // If signing out from target, go back to beginning
        setWorkflowStep('source-login');
      }
    } catch (error) {
      addLog(`Error signing out: ${error.message}`, 'error');
      console.error('Error signing out:', error);
    }
  };

  // Source database operations
  const fetchSourceData = async () => {
    addLog('Fetching data from source database...');

    try {
      // Fetch owners
      addLog('Fetching owners...');
      const ownersResponse = await executeSourceQuery(listOwners, {
        limit: 1000
      });

      const owners = ownersResponse.listOwners.items;
      addLog(`Fetched ${owners.length} owners`, 'success');

      // Fetch units
      addLog('Fetching units...');
      const unitsResponse = await executeSourceQuery(listUnits, {
        limit: 1000
      });

      const units = unitsResponse.listUnits.items;
      addLog(`Fetched ${units.length} units`, 'success');

      // Fetch payments
      addLog('Fetching payments...');
      const paymentsResponse = await executeSourceQuery(listPayments, {
        limit: 1000
      });

      const payments = paymentsResponse.listPayments.items;
      addLog(`Fetched ${payments.length} payments`, 'success');

      // Update state with fetched data
      setSourceData({
        owners,
        units,
        payments
      });

      addLog('Source data fetched successfully', 'success');
    } catch (error) {
      addLog(`Error fetching source data: ${error.message}`, 'error');
      console.error('Error fetching source data:', error);
    }
  };

  // Target database operations
  const clearTargetData = async () => {
    addLog('Clearing target database...');

    try {
      // 1. Fetch existing profiles
      addLog('Fetching existing profiles to delete...');
      const profilesResponse = await executeTargetQuery(`
      query ListProfiles {
        profilesByTypeBalance(
          byTypeBalance: "PROFILE"
          sortDirection: ASC
          limit: 1000
        ) {
          items {
            id
          }
        }
      }
    `);

      const profiles = profilesResponse.profilesByTypeBalance.items;
      addLog(`Found ${profiles.length} profiles to delete`, 'info');

      // 2. Fetch existing properties
      addLog('Fetching existing properties to delete...');
      const propertiesResponse = await executeTargetQuery(`
      query ListProperties {
        propertiesByType(
          type: "PROPERTY"
          sortDirection: ASC
          limit: 1000
        ) {
          items {
            id
          }
        }
      }
    `);

      const properties = propertiesResponse.propertiesByType.items;
      addLog(`Found ${properties.length} properties to delete`, 'info');

      // 3. Fetch existing payments
      addLog('Fetching existing payments to delete...');
      const paymentsResponse = await executeTargetQuery(`
      query ListPayments {
        paymentsByTypeCreatedAt(
          byTypeCreatedAt: "PAYMENT"
          sortDirection: DESC
          limit: 1000
        ) {
          items {
            id
          }
        }
      }
    `);

      const payments = paymentsResponse.paymentsByTypeCreatedAt.items;
      addLog(`Found ${payments.length} payments to delete`, 'info');

      // 4. Delete payments first (due to foreign key constraints)
      if (payments.length > 0) {
        addLog(`Deleting ${payments.length} payments...`);
        for (const payment of payments) {
          await executeTargetMutation(`
          mutation DeletePayment($input: DeletePaymentInput!) {
            deletePayment(input: $input) {
              id
            }
          }
        `, {
            input: { id: payment.id }
          });
        }
        addLog('All payments deleted successfully', 'success');
      }

      // 5. Delete properties
      if (properties.length > 0) {
        addLog(`Deleting ${properties.length} properties...`);
        for (const property of properties) {
          await executeTargetMutation(`
          mutation DeleteProperty($input: DeletePropertyInput!) {
            deleteProperty(input: $input) {
              id
            }
          }
        `, {
            input: { id: property.id }
          });
        }
        addLog('All properties deleted successfully', 'success');
      }

      // 6. Delete profiles
      if (profiles.length > 0) {
        addLog(`Deleting ${profiles.length} profiles...`);
        for (const profile of profiles) {
          await executeTargetMutation(`
          mutation DeleteProfile($input: DeleteProfileInput!) {
            deleteProfile(input: $input) {
              id
            }
          }
        `, {
            input: { id: profile.id }
          });
        }
        addLog('All profiles deleted successfully', 'success');
      }

      // Update local state
      setTargetData({
        profiles: [],
        properties: [],
        payments: []
      });

      addLog('Target database cleared successfully', 'success');
    } catch (error) {
      addLog(`Error clearing target data: ${error.message}`, 'error');
      console.error('Error clearing target data:', error);
    }
  };

  const loadTargetData = async () => {
    addLog('Loading data to target database...');

    try {
      const { owners, units, payments } = sourceData;

      if (owners.length === 0) {
        addLog('No source data to load. Please fetch source data first.', 'warning');
        return;
      }

      // 1. Create profiles from owners
      addLog(`Creating ${owners.length} profiles...`);
      const profileMap = {}; // Map to store old ID -> new ID mapping

      for (const owner of owners) {
        const profileInput = {
          name: owner.name,
          email: owner.email,
          phone: owner.phone,
          address: owner.address1 + (owner.address2 ? `, ${owner.address2}` : ''),
          city: owner.city,
          state: owner.state,
          zip: owner.zip,
          contactPref: "EMAIL", // Default value
          billingFreq: "MONTHLY", // Default value
          allowText: false, // Default value
          balance: 0.00 // Default value
        };

        const result = await executeTargetMutation(`
        mutation CreateProfile($input: CreateProfileInput!) {
          createProfile(input: $input) {
            id
          }
        }
      `, {
          input: profileInput
        });

        profileMap[owner.id] = result.createProfile.id;
      }

      addLog('All profiles created successfully', 'success');

      // 2. Create properties from units
      addLog(`Creating ${units.length} properties...`);
      const propertyMap = {}; // Map to store old ID -> new ID mapping

      for (const unit of units) {
        // Skip if owner ID doesn't have a corresponding profile
        if (!unit.owner || !profileMap[unit.owner.id]) {
          addLog(`Skipping unit ${unit.id} - owner not found`, 'warning');
          continue;
        }

        const propertyInput = {
          address: `Unit ${unit.unitNumber}`,
          city: "West Columbia", // Default from schema
          state: "SC", // Default from schema
          zip: "29169", // Default from schema
          profOwnerId: profileMap[unit.owner.id]
        };

        const result = await executeTargetMutation(`
        mutation CreateProperty($input: CreatePropertyInput!) {
          createProperty(input: $input) {
            id
          }
        }
      `, {
          input: propertyInput
        });

        propertyMap[unit.id] = result.createProperty.id;
      }

      addLog('All properties created successfully', 'success');

      // 3. Create payments
      addLog(`Creating ${payments.length} payments...`);

      for (const payment of payments) {
        // Skip if owner ID doesn't have a corresponding profile
        if (!payment.ownerPaymentsId || !profileMap[payment.ownerPaymentsId]) {
          addLog(`Skipping payment ${payment.id} - owner not found`, 'warning');
          continue;
        }

        const paymentInput = {
          checkDate: payment.checkDate,
          checkNumber: payment.checkNumber,
          checkAmount: payment.checkAmount,
          invoiceNumber: payment.invoiceNumber,
          invoiceAmount: payment.invoiceAmount,
          ownerPaymentsId: profileMap[payment.ownerPaymentsId]
        };

        await executeTargetMutation(`
        mutation CreatePayment($input: CreatePaymentInput!) {
          createPayment(input: $input) {
            id
          }
        }
      `, {
          input: paymentInput
        });
      }

      addLog('All payments created successfully', 'success');

      // Fetch the newly created data to update local state
      await fetchTargetData();

      addLog('Data loaded to target successfully', 'success');
    } catch (error) {
      addLog(`Error loading target data: ${error.message}`, 'error');
      console.error('Error loading target data:', error);
    }
  };

  // Add a function to fetch target data and verify migration
  const fetchTargetData = async () => {
    addLog('Fetching data from target database for verification...', 'info');

    try {
      // 1. Fetch profiles
      const profilesResponse = await executeTargetQuery(`
      query ListProfiles {
        profilesByTypeBalance(
          byTypeBalance: "PROFILE"
          sortDirection: ASC
          limit: 1000
        ) {
          items {
            id
            name
            email
            phone
            address
            city
            state
            zip
            balance
            createdAt
          }
        }
      }
    `);

      const profiles = profilesResponse.profilesByTypeBalance.items;
      addLog(`Fetched ${profiles.length} profiles from target`, 'info');

      // 2. Fetch properties
      const propertiesResponse = await executeTargetQuery(`
      query ListProperties {
        propertiesByType(
          type: "PROPERTY"
          sortDirection: ASC
          limit: 1000
        ) {
          items {
            id
            address
            city
            state
            zip
            profOwnerId
            createdAt
          }
        }
      }
    `);

      const properties = propertiesResponse.propertiesByType.items;
      addLog(`Fetched ${properties.length} properties from target`, 'info');

      // 3. Fetch payments
      const paymentsResponse = await executeTargetQuery(`
      query ListPayments {
        paymentsByTypeCreatedAt(
          byTypeCreatedAt: "PAYMENT"
          sortDirection: DESC
          limit: 1000
        ) {
          items {
            id
            checkDate
            checkNumber
            checkAmount
            invoiceNumber
            invoiceAmount
            ownerPaymentsId
            createdAt
          }
        }
      }
    `);

      const payments = paymentsResponse.paymentsByTypeCreatedAt.items;
      addLog(`Fetched ${payments.length} payments from target`, 'info');

      // Update state with fetched data
      setTargetData({
        profiles,
        properties,
        payments
      });

      // Perform detailed verification
      addLog('Beginning detailed verification...', 'info');

      // Compare record counts
      const sourceCounts = {
        owners: sourceData.owners.length,
        units: sourceData.units.length,
        payments: sourceData.payments.length
      };

      const targetCounts = {
        profiles: profiles.length,
        properties: properties.length,
        payments: payments.length
      };

      addLog('Comparing record counts:', 'info');
      addLog(`Source: Owners=${sourceCounts.owners}, Units=${sourceCounts.units}, Payments=${sourceCounts.payments}`, 'info');
      addLog(`Target: Profiles=${targetCounts.profiles}, Properties=${targetCounts.properties}, Payments=${targetCounts.payments}`, 'info');

      const countVerification =
        sourceCounts.owners === targetCounts.profiles &&
        sourceCounts.units === targetCounts.properties &&
        sourceCounts.payments === targetCounts.payments;

      if (countVerification) {
        addLog('✅ Record count verification passed', 'success');
      } else {
        addLog('❌ Record count verification failed', 'warning');
      }

      // Verify profile data (sample check)
      addLog('Verifying profile data integrity...', 'info');
      let profileVerificationPassed = true;
      const profileSampleSize = Math.min(5, profiles.length);

      if (profiles.length > 0) {
        // Create a map of source owners by name for easier lookup
        const ownersByName = {};
        sourceData.owners.forEach(owner => {
          ownersByName[owner.name] = owner;
        });

        // Check a sample of profiles
        for (let i = 0; i < profileSampleSize; i++) {
          const profile = profiles[i];
          const sourceOwner = ownersByName[profile.name];

          if (!sourceOwner) {
            addLog(`❌ Profile "${profile.name}" not found in source data`, 'warning');
            profileVerificationPassed = false;
            continue;
          }

          // Check key fields
          if (profile.email !== sourceOwner.email) {
            addLog(`❌ Email mismatch for ${profile.name}: ${profile.email} vs ${sourceOwner.email}`, 'warning');
            profileVerificationPassed = false;
          }

          if (profile.phone !== sourceOwner.phone) {
            addLog(`❌ Phone mismatch for ${profile.name}: ${profile.phone} vs ${sourceOwner.phone}`, 'warning');
            profileVerificationPassed = false;
          }
        }

        if (profileVerificationPassed) {
          addLog(`✅ Profile data verification passed (sampled ${profileSampleSize} records)`, 'success');
        }
      }

      // Verify property data (sample check)
      addLog('Verifying property data integrity...', 'info');
      let propertyVerificationPassed = true;
      const propertySampleSize = Math.min(5, properties.length);

      if (properties.length > 0 && sourceData.units.length > 0) {
        // Create a map of properties by address for easier lookup
        const propertiesByAddress = {};
        properties.forEach(property => {
          propertiesByAddress[property.address] = property;
        });

        // Check a sample of units
        for (let i = 0; i < propertySampleSize && i < sourceData.units.length; i++) {
          const unit = sourceData.units[i];
          const unitAddress = `Unit ${unit.unitNumber}`;
          const targetProperty = propertiesByAddress[unitAddress];

          if (!targetProperty) {
            addLog(`❌ Property "${unitAddress}" not found in target data`, 'warning');
            propertyVerificationPassed = false;
            continue;
          }
        }

        if (propertyVerificationPassed) {
          addLog(`✅ Property data verification passed (sampled ${propertySampleSize} records)`, 'success');
        }
      }

      // Verify payment data (sample check)
      addLog('Verifying payment data integrity...', 'info');
      let paymentVerificationPassed = true;
      const paymentSampleSize = Math.min(5, payments.length);

      if (payments.length > 0 && sourceData.payments.length > 0) {
        // Create a map of source payments by check number for easier lookup
        const paymentsByCheckNumber = {};
        sourceData.payments.forEach(payment => {
          paymentsByCheckNumber[payment.checkNumber] = payment;
        });

        // Check a sample of payments
        for (let i = 0; i < paymentSampleSize && i < payments.length; i++) {
          const payment = payments[i];
          const sourcePayment = paymentsByCheckNumber[payment.checkNumber];

          if (!sourcePayment) {
            addLog(`❌ Payment with check number "${payment.checkNumber}" not found in source data`, 'warning');
            paymentVerificationPassed = false;
            continue;
          }

          // Check key fields
          if (parseFloat(payment.checkAmount) !== parseFloat(sourcePayment.checkAmount)) {
            addLog(`❌ Check amount mismatch for check #${payment.checkNumber}: ${payment.checkAmount} vs ${sourcePayment.checkAmount}`, 'warning');
            paymentVerificationPassed = false;
          }

          if (payment.invoiceNumber !== sourcePayment.invoiceNumber) {
            addLog(`❌ Invoice number mismatch for check #${payment.checkNumber}: ${payment.invoiceNumber} vs ${sourcePayment.invoiceNumber}`, 'warning');
            paymentVerificationPassed = false;
          }
        }

        if (paymentVerificationPassed) {
          addLog(`✅ Payment data verification passed (sampled ${paymentSampleSize} records)`, 'success');
        }
      }

      // Overall verification result
      if (countVerification && profileVerificationPassed && propertyVerificationPassed && paymentVerificationPassed) {
        addLog('✅ VERIFICATION SUCCESSFUL: All checks passed', 'success');
      } else {
        addLog('❌ VERIFICATION INCOMPLETE: Some checks failed', 'warning');
      }

    } catch (error) {
      addLog(`Error fetching target data: ${error.message}`, 'error');
      console.error('Error fetching target data:', error);
    }
  };

  // Add this function to the App component
  const handleReset = async () => {
    try {
      addLog('Resetting migration process...', 'info');

      // Sign out if currently authenticated
      if (workflowStep !== 'source-login') {
        try {
          await amplifySignOut();
          addLog('Signed out successfully', 'success');
        } catch (error) {
          addLog(`Error during sign out: ${error.message}`, 'warning');
          // Continue with reset even if sign out fails
        }
      }

      // Reset all state
      setWorkflowStep('source-login');
      setSourceData({
        owners: [],
        units: [],
        payments: []
      });
      setTargetData({
        profiles: [],
        properties: [],
        payments: []
      });

      // Configure Amplify for source database
      Amplify.configure(sourceConfig);

      addLog('Migration process reset. Ready to start again.', 'success');
    } catch (error) {
      addLog(`Error resetting migration process: ${error.message}`, 'error');
      console.error('Error resetting migration process:', error);
    }
  };


  // Render different components based on workflow step
  const renderWorkflowStep = () => {
    switch (workflowStep) {
      case 'source-login':
        return (
          <div className="auth-container">
            <h2>Step 1: Sign in to Source Database</h2>
            <p>Authenticate with the source database to fetch data.</p>
            <Authenticator>
              {({ signOut, user }) => {
                // Move to source management after login
                setWorkflowStep('source-management');
                return <div>Source authentication successful!</div>;
              }}
            </Authenticator>
          </div>
        );

      case 'source-management':
        return (
          <div className="management-container">
            <h2>Source Database Management</h2>
            <p>Fetch and review data from the source database.</p>

            <div className="action-buttons">
              <button onClick={fetchSourceData}>Fetch Source Data</button>
              <button onClick={() => setWorkflowStep('source-logout')}>
                Proceed to Next Step
              </button>
            </div>

            <div className="data-summary">
              <h3>Source Data Summary</h3>
              <ul>
                <li>Owners: {sourceData.owners.length}</li>
                <li>Units: {sourceData.units.length}</li>
                <li>Payments: {sourceData.payments.length}</li>
              </ul>
            </div>

            {/* Display sample of the data */}
            {sourceData.owners.length > 0 && (
              <div className="data-preview">
                <h3>Sample Data</h3>
                <div>
                  <h4>Owners (first 5)</h4>
                  <pre>{JSON.stringify(sourceData.owners.slice(0, 5), null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        );

      case 'source-logout':
        return (
          <div className="logout-container">
            <h2>Step 2: Sign Out from Source Database</h2>
            <p>You've successfully fetched data from the source database.</p>
            <p>Now, sign out from the source database to proceed to the target database.</p>
            <button onClick={handleSignOut}>
              Sign Out & Proceed
            </button>
          </div>
        );

      case 'target-login':
        return (
          <div className="auth-container">
            <h2>Step 3: Sign in to Target Database</h2>
            <p>Authenticate with the target database to migrate data.</p>
            <Authenticator>
              {({ signOut, user }) => {
                // Move to target management after login
                setWorkflowStep('target-management');
                return <div>Target authentication successful!</div>;
              }}
            </Authenticator>
          </div>
        );

      case 'target-management':
        return (
          <div className="management-container">
            <h2>Target Database Management</h2>
            <p>Manage data migration to the target database.</p>

            <div className="action-buttons">
              <button onClick={clearTargetData}>Clear Target Data</button>
              <button
                onClick={loadTargetData}
                disabled={sourceData.owners.length === 0}
              >
                Load Data to Target
              </button>
              <button onClick={fetchTargetData}>Verify Migration</button>
              <button onClick={() => setWorkflowStep('complete')}>
                Complete Migration
              </button>
            </div>

            <div className="data-summary">
              <h3>Data Summary</h3>
              <div className="summary-grid">
                <div className="summary-card">
                  <h4>Source Data</h4>
                  <ul>
                    <li>Owners: {sourceData.owners.length}</li>
                    <li>Units: {sourceData.units.length}</li>
                    <li>Payments: {sourceData.payments.length}</li>
                  </ul>
                </div>
                <div className="summary-card">
                  <h4>Target Data</h4>
                  <ul>
                    <li>Profiles: {targetData.profiles.length}</li>
                    <li>Properties: {targetData.properties.length}</li>
                    <li>Payments: {targetData.payments.length}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="complete-container">
            <h2>Migration Complete</h2>
            <p>The data migration process has been completed.</p>
            <button onClick={handleSignOut}>
              Start New Migration
            </button>
          </div>
        );

      default:
        return <div>Unknown workflow step</div>;
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>HOA Data Migration Tool</h1>
        <div className="workflow-indicator">
          <div
            className={`step ${workflowStep.startsWith('source-login') ? 'active' : workflowStep.startsWith('source') || workflowStep.startsWith('target') ? 'complete' : ''}`}
            onClick={() => {
              // Only allow reset if not already on the first step
              if (workflowStep !== 'source-login') {
                handleReset();
              }
            }}
            style={{ cursor: workflowStep !== 'source-login' ? 'pointer' : 'default' }}
            title={workflowStep !== 'source-login' ? "Click to restart migration process" : ""}
          >
            1. Source Login
          </div>
          <div className={`step ${workflowStep === 'source-management' ? 'active' : workflowStep === 'source-logout' || workflowStep.startsWith('target') ? 'complete' : ''}`}>
            2. Fetch Source Data
          </div>
          <div className={`step ${workflowStep === 'source-logout' ? 'active' : workflowStep.startsWith('target') ? 'complete' : ''}`}>
            3. Source Logout
          </div>
          <div className={`step ${workflowStep === 'target-login' ? 'active' : workflowStep === 'target-management' || workflowStep === 'complete' ? 'complete' : ''}`}>
            4. Target Login
          </div>
          <div className={`step ${workflowStep === 'target-management' ? 'active' : workflowStep === 'complete' ? 'complete' : ''}`}>
            5. Migrate Data
          </div>
          <div className={`step ${workflowStep === 'complete' ? 'active' : ''}`}>
            6. Complete
          </div>
        </div>
      </header>

      <main className="App-main">
        {renderWorkflowStep()}
      </main>

      <div className="logs-container">
        <h2>Migration Logs</h2>
        <div className="logs">
          {logs.map((log, index) => (
            <div key={index} className={`log-entry ${log.type}`}>
              <span className="timestamp">{log.timestamp}</span>
              <span className="message">{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
