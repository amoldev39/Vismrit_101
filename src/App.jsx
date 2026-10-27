import React, { useState, useEffect } from 'react';
import './LPOAAuthorization.css';
import { downloadTermsPdf, printTermsDocument } from './generatePdf.js';

export default function App({ userId = 'user_1', onAccept, onCancel }) {
  // Active user ID (customizable or passed as a prop in your major project)
  const [activeUserId, setActiveUserId] = useState(userId);

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [authorizeDeletion, setAuthorizeDeletion] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [deletionAuthorized, setDeletionAuthorized] = useState(false);
  const [confirmedAt, setConfirmedAt] = useState(null);
  const [termsVersion, setTermsVersion] = useState('1.0');

  const [apiError, setApiError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);

  // Fetch current acceptance status for activeUserId from backend
  useEffect(() => {
    let isMounted = true;

    async function loadUserConsent() {
      setIsLoading(true);
      setApiError(null);
      setInfoMessage(null);

      try {
        const response = await fetch(`/api/consent/terms?userId=${encodeURIComponent(activeUserId)}`);
        if (!response.ok) {
          throw new Error(`Failed to load consent: HTTP ${response.status}`);
        }

        const data = await response.json();
        if (!isMounted) return;

        if (data.termsAccepted) {
          setIsSubmitted(true);
          setDeletionAuthorized(Boolean(data.deletionAuthorized));
          setConfirmedAt(data.termsAcceptedAt);
          setTermsVersion(data.termsVersion || '1.0');
          setAgreeTerms(true);
          setAuthorizeDeletion(Boolean(data.deletionAuthorized));
        } else {
          setIsSubmitted(false);
          setDeletionAuthorized(false);
          setConfirmedAt(null);
          setAgreeTerms(false);
          setAuthorizeDeletion(false);
        }
      } catch (err) {
        console.error('Error fetching consent status:', err);
        if (isMounted) {
          setApiError('Could not connect to backend server. Make sure backend is running on port 5000.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadUserConsent();

    return () => {
      isMounted = false;
    };
  }, [activeUserId]);

  const isFormValid = agreeTerms && authorizeDeletion;

  // When user clicks "I Agree" -> send { termsAccepted: true, deletionAuthorized: true, userId }
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setApiError(null);
    setInfoMessage(null);

    try {
      const response = await fetch('/api/consent/terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUserId,
          termsAccepted: true,
          deletionAuthorized: true,
          termsVersion: '1.0',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save terms acceptance.');
      }

      // Record saved successfully
      setIsSubmitted(true);
      setDeletionAuthorized(true);
      setConfirmedAt(data.termsAcceptedAt);
      setTermsVersion(data.termsVersion || '1.0');

      if (typeof onAccept === 'function') {
        onAccept(data);
      }
    } catch (err) {
      console.error('Submit error:', err);
      setApiError(err.message || 'Error recording acceptance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // When user clicks "Cancel" / "Revoke" -> send { termsAccepted: false, deletionAuthorized: false, userId }
  const handleCancel = async () => {
    setIsSubmitting(true);
    setApiError(null);

    try {
      const response = await fetch('/api/consent/terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUserId,
          termsAccepted: false,
          deletionAuthorized: false,
          termsVersion: '1.0',
        }),
      });

      const data = await response.json();

      setIsSubmitted(false);
      setDeletionAuthorized(false);
      setAgreeTerms(false);
      setAuthorizeDeletion(false);
      setConfirmedAt(null);
      setInfoMessage(`Consent and deletion authorization revoked for ${activeUserId}.`);

      if (typeof onCancel === 'function') {
        onCancel(data);
      }
    } catch (err) {
      console.error('Cancel error:', err);
      setApiError('Failed to record cancellation on backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick user switcher to test multi-user independence
  const handleToggleUser = () => {
    setActiveUserId((prev) => (prev === 'user_1' ? 'user_2' : 'user_1'));
  };

  // Download copy of terms as stylish PDF
  const handleDownload = () => {
    downloadTermsPdf(activeUserId, confirmedAt, authorizeDeletion || deletionAuthorized);
  };

  // Preview or print high-resolution stylish PDF
  const handlePrint = () => {
    printTermsDocument(activeUserId, confirmedAt, authorizeDeletion || deletionAuthorized);
  };

  return (
    <div className="google-layout">
      <div className="google-card">
        {/* User Badge & Independent User Switcher */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div className="google-user-chip">
            <span>👤 Active User ID: <strong>{activeUserId}</strong></span>
            <button
              type="button"
              className="google-user-switch-btn"
              onClick={handleToggleUser}
              title="Click to switch user and see that each user has independent true/false status"
            >
              Switch to {activeUserId === 'user_1' ? 'user_2' : 'user_1'}
            </button>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#8ab4f8' }}>
            Status: <strong style={{ color: isSubmitted ? '#34a853' : '#fbbc04' }}>{isSubmitted ? 'AUTHORIZED (true)' : 'PENDING (false)'}</strong>
          </span>
        </div>

        {/* Header */}
        <div className="google-card-header">
          <div className="google-brand-row">
            <div className="google-brand-icon">🛡️</div>
            <span className="google-brand-name">Vismrit Privacy Sentinel India</span>
          </div>
          <h1 className="google-card-title">Terms of Service</h1>
          <p className="google-card-desc">
            Please read these Terms of Service carefully before creating an account or using Vismrit. By creating an account, selecting <strong>“I Agree,”</strong> or using our services, you acknowledge that you have read and understood these terms.
          </p>
        </div>

        {/* Notifications */}
        {apiError && (
          <div className="google-error-banner">
            <span>⚠️</span>
            <span>{apiError}</span>
          </div>
        )}

        {infoMessage && (
          <div className="google-info-banner">
            <span>ℹ️</span>
            <span>{infoMessage}</span>
          </div>
        )}

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#9aa0a6' }}>
            <div className="google-spinner" style={{ width: '24px', height: '24px', borderTopColor: '#8ab4f8' }}></div>
            <div style={{ marginTop: '12px', fontSize: '0.875rem' }}>Checking consent for {activeUserId}...</div>
          </div>
        ) : isSubmitted ? (
          /* Success View when termsAccepted is TRUE */
          <div className="google-success-box">
            <div className="google-success-badge">✓</div>
            <h2 className="google-success-title">Terms & Deletion Authorization Accepted</h2>
            <p className="google-success-desc">
              Consent recorded for <strong>{activeUserId}</strong>.
              <br />
              <span style={{ color: '#8ab4f8', fontWeight: 500 }}>
                Terms of Service: Accepted (true) • Data Deletion Mandate: Authorized (true)
              </span>
              <br />
              {confirmedAt && (
                <span style={{ display: 'block', marginTop: '8px', fontSize: '0.8rem', color: '#9aa0a6' }}>
                  Recorded at (UTC): {new Date(confirmedAt).toUTCString()} (Version {termsVersion})
                </span>
              )}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="google-btn-text" onClick={handleDownload} title="Download / Save as PDF">
                📥 Download / Save PDF
              </button>
              <button type="button" className="google-btn-text" onClick={handlePrint} title="Preview or print executive report">
                🖨️ Print / Preview Report
              </button>
              <button
                type="button"
                className="google-btn-secondary"
                onClick={handleCancel}
                disabled={isSubmitting}
                title="Sets termsAccepted and deletionAuthorized back to false in backend"
              >
                {isSubmitting ? 'Revoking...' : 'Revoke / Set False'}
              </button>
            </div>
          </div>
        ) : (
          /* Agreement View when termsAccepted is FALSE */
          <form onSubmit={handleSubmit}>
            {/* Scrollable Terms & Conditions Box (Google Style) */}
            <div className="google-terms-box">
              <div style={{ color: '#8ab4f8', fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>
                Vismrit Privacy Sentinel India
              </div>
              <div style={{ fontSize: '0.85rem', color: '#e8eaed', fontWeight: 600, marginBottom: '14px' }}>
                Terms of Service
              </div>

              <p className="google-terms-para" style={{ color: '#e8eaed', marginBottom: '16px' }}>
                Please read these Terms of Service carefully before creating an account or using Vismrit. By creating an account, selecting <strong>“I Agree,”</strong> or using our services, you acknowledge that you have read and understood these terms.
              </p>

              <div className="google-terms-heading">1. Acceptance of Terms</div>
              <p className="google-terms-para">
                By accessing or using Vismrit Privacy Sentinel India (“Vismrit,” “we,” “our,” or “us”), you agree to comply with these Terms of Service and our Privacy Policy. These terms govern your access to our website, applications, and privacy management services. If you do not agree with these terms, please refrain from using our services.
              </p>

              <div className="google-terms-heading">2. Account Information</div>
              <p className="google-terms-para">
                You agree to provide accurate, complete, and up-to-date information when registering for an account or using our services. You are responsible for maintaining the confidentiality of your login credentials and protecting your account against unauthorized access. You must promptly notify us if you suspect any unauthorized activity or misuse of your account.
              </p>

              <div className="google-terms-heading">3. Use of Services</div>
              <p className="google-terms-para">
                Vismrit provides tools to help users discover their online presence and manage personal data deletion, correction, consent withdrawal, and unlisting requests on supported third-party platforms. You agree to use these services only for lawful purposes and provide information that you are authorized to share. We reserve the right to restrict access where services are misused or these terms are violated.
              </p>

              <div className="google-terms-heading">4. Consent and Authorization</div>
              <p className="google-terms-para">
                By using our services, you consent to the processing of information necessary to provide the features you request, in accordance with our Privacy Policy and applicable law. Certain actions, including submitting privacy requests on your behalf, may require separate consent, identity verification, or explicit authorization. You may revoke applicable authorization through the designated process, subject to legal requirements and actions already taken.
              </p>

              <div className="google-terms-heading">5. Privacy and Data Protection</div>
              <p className="google-terms-para">
                We respect your privacy and aim to handle your personal information transparently and securely. Information collected through our services is processed in accordance with our Privacy Policy and applicable data protection laws. We implement reasonable technical and organizational safeguards to protect information against unauthorized access, loss, misuse, or disclosure. However, no online service can guarantee absolute security.
              </p>

              <div className="google-terms-heading">6. Third-Party Services</div>
              <p className="google-terms-para">
                Vismrit may interact with external websites, search engines, directories, and other platforms to facilitate privacy-related requests. These third parties operate independently and may follow their own policies, verification procedures, and data retention practices. We cannot guarantee that a request will be approved or that information will be permanently removed from every source. Users may need to follow additional procedures required by the relevant platform.
              </p>

              <div className="google-terms-heading">7. Amendments and Termination</div>
              <p className="google-terms-para">
                We may update these Terms of Service to reflect changes in our services, operational practices, or applicable legal requirements. Updated terms will be published on our platform, along with the revised date where appropriate. We may suspend or restrict access when reasonably necessary and permitted by law. You may stop using our services at any time and revoke applicable authorization through the designated process. Certain records may be retained where permitted or required by law.
              </p>

              <p className="google-terms-para" style={{ marginTop: '16px', borderTop: '1px solid #2d2f31', paddingTop: '12px', color: '#e8eaed' }}>
                By selecting <strong>“I Agree,”</strong> you confirm that you have read and understood these Terms of Service and agree to their applicable provisions.
              </p>
            </div>

            {/* General Terms Agreement Checkbox */}
            <div className="google-consent-group" style={{ marginBottom: '1rem' }}>
              <label className="google-consent-row">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => {
                    setAgreeTerms(e.target.checked);
                    setInfoMessage(null);
                  }}
                  disabled={isSubmitting}
                />
                <span>
                  I have read and agree to the <strong>Terms of Service</strong> and <strong>Privacy Policy</strong> for Vismrit Privacy Sentinel India.
                </span>
              </label>
            </div>

            {/* Feature: Authorization to Submit Data Deletion Requests */}
            <div style={{
              background: 'rgba(26, 115, 232, 0.08)',
              border: '1px solid rgba(138, 180, 248, 0.3)',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '1.5rem',
            }}>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#8ab4f8',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span style={{ fontSize: '1.1rem' }}>🛡️</span>
                <span>Authorization to Submit Data Deletion Requests</span>
              </div>

              <label className="google-consent-row" style={{ margin: 0, alignItems: 'flex-start' }}>
                <input
                  type="checkbox"
                  checked={authorizeDeletion}
                  onChange={(e) => {
                    setAuthorizeDeletion(e.target.checked);
                    setInfoMessage(null);
                  }}
                  disabled={isSubmitting}
                />
                <span style={{ fontSize: '0.8125rem', lineHeight: 1.6, color: '#e8eaed' }}>
                  <strong>I authorize Vismrit Privacy Sentinel India to act on my behalf</strong> to prepare and submit personal data deletion, removal, or unlisting requests to the selected data brokers and third-party platforms. I confirm that the information I have provided is accurate and that I have the authority to make these requests. I understand that Vismrit may share the necessary information with the relevant platforms to process my requests. I acknowledge that the final decision to remove my data rests with the respective platform and that I may revoke this authorization through the designated process, subject to applicable law and actions already taken.
                </span>
              </label>
            </div>

            {/* Google-Style Action Buttons: Cancel and I Agree */}
            <div className="google-actions-row">
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button type="button" className="google-btn-text" onClick={handleDownload} disabled={isSubmitting} title="Download / Save as PDF">
                  📥 Download / Save PDF
                </button>
                <button type="button" className="google-btn-text" onClick={handlePrint} disabled={isSubmitting} title="Preview or print executive report">
                  🖨️ Print / Preview Report
                </button>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="google-btn-secondary"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="google-btn-primary"
                  disabled={!isFormValid || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="google-spinner"></span>
                      Saving...
                    </>
                  ) : (
                    'I agree'
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
