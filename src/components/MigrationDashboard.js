import React, { useState, useEffect } from 'react';
import './MigrationDashboard.css';
import * as sourceQueries from '../graphql/sourceQueries';
import * as targetQueries from '../graphql/targetQueries';
import * as targetMutations from '../graphql/targetMutations';
import { getCurrentUser } from '../services/auth-service';

const MigrationDashboard = ({ currentEnv, signOut, executeQuery, executeMutation }) => {
  const [user, setUser] = useState(null);
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
  
  const [mappings, setMappings] = useState({
    ownerToProfileId: {},
    unitToPropertyId: {}
  });
  
  const [status, setStatus] = useState('idle');
  const [logs, setLogs] = useState([]);
  
  // Get current user info
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await getCurrentUser(currentEnv);
        setUser(userData);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    
    fetchUser();
  }, [currentEnv]);
  
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prevLogs => [...prevLogs, { message, type, timestamp }]);
  };

    const fetchSourceData = async () => {
        setStatus('fetching');
        addLog('Fetching data from source database...');

        try {
            // Fetch owners
            let nextToken = null;
            let owners = [];
            do {
                const ownersData = await executeQuery(
                    sourceQueries.listOwners,
                    { limit: 100, nextToken }
                );
                owners = [...owners, ...ownersData.listOwners.items];
                nextToken = ownersData.listOwners.nextToken;
            } while (nextToken);

            // Fetch units
            nextToken = null;
            let units = [];
            do {
                const unitsData = await executeQuery(
                    sourceQueries.listUnits,
                    { limit: 100, nextToken }
                );
                units = [...units, ...unitsData.listUnits.items];
                nextToken = unitsData.listUnits.nextToken;
            } while (nextToken);

            // Fetch payments
            nextToken = null;
            let payments = [];
            do {
                const paymentsData = await executeQuery(
                    sourceQueries.listPayments,
                    { limit: 100, nextToken }
                );
                payments = [...payments, ...paymentsData.listPayments.items];
                nextToken = paymentsData.listPayments.nextToken;
            } while (nextToken);

            setSourceData({ owners, units, payments });
            addLog(`Fetched ${owners.length} owners, ${units.length} units, and ${payments.length} payments`, 'success');
            setStatus('fetched');
        } catch (error) {
            addLog(`Error fetching source data: ${error.message}`, 'error');
            setStatus('error');
            console.error('Error fetching source data:', error);
        }
    };

    const clearTargetData = async () => {
        setStatus('clearing');
        addLog('Clearing target database...');

        try {
            // First, fetch all existing data
            let profiles = [];
            let properties = [];
            let payments = [];

            // Fetch profiles
            let nextToken = null;
            do {
                const profilesData = await executeQuery(
                    targetQueries.listProfiles,
                    { limit: 100, nextToken }
                );
                profiles = [...profiles, ...profilesData.listProfiles.items];
                nextToken = profilesData.listProfiles.nextToken;
            } while (nextToken);

            // Fetch properties
            nextToken = null;
            do {
                const propertiesData = await executeQuery(
                    targetQueries.listProperties,
                    { limit: 100, nextToken }
                );
                properties = [...properties, ...propertiesData.listProperties.items];
                nextToken = propertiesData.listProperties.nextToken;
            } while (nextToken);

            // Fetch payments
            nextToken = null;
            do {
                const paymentsData = await executeQuery(
                    targetQueries.listPayments,
                    { limit: 100, nextToken }
                );
                payments = [...payments, ...paymentsData.listPayments.items];
                nextToken = paymentsData.listPayments.nextToken;
            } while (nextToken);

            addLog(`Found ${profiles.length} profiles, ${properties.length} properties, and ${payments.length} payments to delete`);

            // Delete payments first (due to foreign key constraints)
            for (const payment of payments) {
                await executeMutation(
                    targetMutations.deletePayment,
                    { input: { id: payment.id } }
                );
            }

            // Delete properties
            for (const property of properties) {
                await executeMutation(
                    targetMutations.deleteProperty,
                    { input: { id: property.id } }
                );
            }

            // Delete profiles
            for (const profile of profiles) {
                await executeMutation(
                    targetMutations.deleteProfile,
                    { input: { id: profile.id } }
                );
            }

            addLog(`Deleted ${profiles.length} profiles, ${properties.length} properties, and ${payments.length} payments`, 'success');
            setStatus('cleared');
        } catch (error) {
            addLog(`Error clearing target data: ${error.message}`, 'error');
            setStatus('error');
            console.error('Error clearing target data:', error);
        }
    };

    const loadTargetData = async () => {
        setStatus('loading');
        addLog('Loading data to target database...');

        try {
            const newMappings = {
                ownerToProfileId: {},
                unitToPropertyId: {}
            };

            // Create profiles from owners
            addLog("Creating profiles...");
            for (const owner of sourceData.owners) {
                const profileInput = {
                    name: owner.name,
                    email: owner.email || "",
                    phone: owner.phone || "",
                    address: owner.address1 + (owner.address2 ? ` ${owner.address2}` : ""),
                    city: owner.city,
                    state: owner.state,
                    zip: owner.zip,
                    contactPref: "EMAIL",
                    billingFreq: "MONTHLY",
                    allowText: false,
                    balance: 0.00
                };

                try {
                    const newProfile = await executeMutation(
                        targetMutations.createProfile,
                        { input: profileInput }
                    );

                    // Store mapping from source owner ID to target profile ID
                    newMappings.ownerToProfileId[owner.id] = newProfile.createProfile.id;
                } catch (error) {
                    addLog(`Error creating profile for ${owner.name}: ${error.message}`, 'error');
                }
            }

            // Create properties from units
            addLog("Creating properties...");
            for (const unit of sourceData.units) {
                if (!unit.owner || !unit.owner.id) continue;

                const profileId = newMappings.ownerToProfileId[unit.owner.id];
                if (!profileId) continue;

                const propertyInput = {
                    address: unit.unitNumber,
                    city: "West Columbia",
                    state: "SC",
                    zip: "29169",
                    profOwnerId: profileId
                };

                try {
                    const newProperty = await executeMutation(
                        targetMutations.createProperty,
                        { input: propertyInput }
                    );

                    // Store mapping from source unit ID to target property ID
                    newMappings.unitToPropertyId[unit.id] = newProperty.createProperty.id;
                } catch (error) {
                    addLog(`Error creating property for unit ${unit.unitNumber}: ${error.message}`, 'error');
                }
            }

            // Create payments
            addLog("Creating payments...");
            for (const payment of sourceData.payments) {
                const profileId = newMappings.ownerToProfileId[payment.ownerPaymentsId];
                if (!profileId) continue;

                const paymentInput = {
                    checkDate: payment.checkDate,
                    checkNumber: payment.checkNumber,
                    checkAmount: payment.checkAmount,
                    invoiceNumber: payment.invoiceNumber,
                    invoiceAmount: payment.invoiceAmount,
                    ownerPaymentsId: profileId
                };

                try {
                    await executeMutation(
                        targetMutations.createPayment,
                        { input: paymentInput }
                    );
                } catch (error) {
                    addLog(`Error creating payment ${payment.invoiceNumber}: ${error.message}`, 'error');
                }
            }

            setMappings(newMappings);
            addLog("Data migration completed successfully", 'success');
            setStatus('loaded');
        } catch (error) {
            addLog(`Error loading target data: ${error.message}`, 'error');
            setStatus('error');
            console.error('Error loading target data:', error);
        }
    };

    return (
        <div className="migration-dashboard">
          <div className="user-info">
            <p>Logged in as: {user ? user.username : 'Loading...'}</p>
            <p>Current environment: <strong>{currentEnv === 'source' ? 'Source' : 'Target'} Database</strong></p>
            <button onClick={signOut}>Sign Out</button>
          </div>

            <div className="migration-controls">
                <h2>Migration Controls</h2>
                <div className="button-group">
                    <button
                        onClick={fetchSourceData}
                        disabled={currentEnv !== 'source' || status === 'fetching'}
                    >
                        Fetch Source Data
                    </button>

                    <button
                        onClick={clearTargetData}
                        disabled={currentEnv !== 'target' || status === 'clearing'}
                    >
                        Clear Target Data
                    </button>

                    <button
                        onClick={loadTargetData}
                        disabled={currentEnv !== 'target' || status === 'loading' || sourceData.owners.length === 0}
                    >
                        Load Target Data
                    </button>
                </div>
            </div>

            <div className="data-summary">
                <h2>Data Summary</h2>
                <div className="summary-grid">
                    <div className="summary-card">
                        <h3>Source Database</h3>
                        <ul>
                            <li>Owners: {sourceData.owners.length}</li>
                            <li>Units: {sourceData.units.length}</li>
                            <li>Payments: {sourceData.payments.length}</li>
                        </ul>
                    </div>

                    <div className="summary-card">
                        <h3>Target Database</h3>
                        <ul>
                            <li>Profiles: {targetData.profiles.length}</li>
                            <li>Properties: {targetData.properties.length}</li>
                            <li>Payments: {targetData.payments.length}</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="data-preview">
                <h2>Data Preview</h2>
                <div className="tabs">
                    <button className="tab-button">Owners/Profiles</button>
                    <button className="tab-button">Units/Properties</button>
                    <button className="tab-button">Payments</button>
                </div>

                <div className="preview-container">
                    {sourceData.owners.length > 0 && (
                        <div className="preview-table">
                            <h3>Source Owners (First 5)</h3>
                            <table>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Phone</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sourceData.owners.slice(0, 5).map(owner => (
                                        <tr key={owner.id}>
                                            <td>{owner.id}</td>
                                            <td>{owner.name}</td>
                                            <td>{owner.email}</td>
                                            <td>{owner.phone}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

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
};

export default MigrationDashboard;

