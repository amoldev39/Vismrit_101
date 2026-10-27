import React, { useState, useRef, useEffect, useMemo } from 'react';
import './LPOAAuthorization.css';

// Default Verified Data Broker Directory
const DEFAULT_BROKERS = [
  { id: 'whitepages', name: 'Whitepages', domain: 'whitepages.com', category: 'People Search', email: 'privacy@whitepages.com', slaDays: 30 },
  { id: 'spokeo', name: 'Spokeo', domain: 'spokeo.com', category: 'People Search', email: 'privacy@spokeo.com', slaDays: 30 },
  { id: 'beenverified', name: 'BeenVerified', domain: 'beenverified.com', category: 'People Search', email: 'optout@beenverified.com', slaDays: 30 },
  { id: 'radaris', name: 'Radaris', domain: 'radaris.com', category: 'People Search', email: 'customer-service@radaris.com', slaDays: 45 },
  { id: 'lexisnexis', name: 'LexisNexis Risk Solutions', domain: 'lexisnexis.com', category: 'Public Records', email: 'privacy.inquiries@lexisnexis.com', slaDays: 45 },
  { id: 'acxiom', name: 'Acxiom', domain: 'acxiom.com', category: 'Marketing & AdTech', email: 'consumerprivacy@acxiom.com', slaDays: 30 },
  { id: 'peoplefinders', name: 'PeopleFinders', domain: 'peoplefinders.com', category: 'People Search', email: 'privacy@peoplefinders.com', slaDays: 30 },
  { id: 'intelius', name: 'Intelius', domain: 'intelius.com', category: 'People Search', email: 'privacy@intelius.com', slaDays: 30 },
  { id: 'truthfinder', name: 'TruthFinder', domain: 'truthfinder.com', category: 'People Search', email: 'privacy@truthfinder.com', slaDays: 30 },
  { id: 'instantcheckmate', name: 'Instant Checkmate', domain: 'instantcheckmate.com', category: 'Public Records', email: 'optout@instantcheckmate.com', slaDays: 30 },
  { id: 'fastpeoplesearch', name: 'FastPeopleSearch', domain: 'fastpeoplesearch.com', category: 'People Search', email: 'privacy@fastpeoplesearch.com', slaDays: 30 },
  { id: 'zoominfo', name: 'ZoomInfo', domain: 'zoominfo.com', category: 'Marketing & AdTech', email: 'privacy@zoominfo.com', slaDays: 30 },
];

export default function LPOAAuthorization({
  companyName = "Vismrit Privacy Sentinel, Inc.",
  companyAddress = "100 Montgomery St, Suite 1400, San Francisco, CA 94104",
  companyEmail = "privacy-ops@vismrit.io",
  initialData = {},
  onSubmit,
  onReset
}) {
  // Principal Identification State
  const [fullName, setFullName] = useState(initialData.fullName || "Jane R. Doe");
  const [emails, setEmails] = useState(initialData.emails || ["jane.doe@example.com", "jdoe.personal@gmail.com"]);
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phone, setPhone] = useState(initialData.phone || "+1 (555) 234-5678");
  const [street, setStreet] = useState(initialData.street || "742 Evergreen Terrace");
  const [city, setCity] = useState(initialData.city || "Springfield");
  const [stateRegion, setStateRegion] = useState(initialData.stateRegion || "IL");
  const [postalCode, setPostalCode] = useState(initialData.postalCode || "62704");
  const [country, setCountry] = useState(initialData.country || "United States");

  // Identification Proof File
  const [idFile, setIdFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Target Broker Selector State
  const [brokers, setBrokers] = useState(DEFAULT_BROKERS);
  const [selectedBrokerIds, setSelectedBrokerIds] = useState(
    new Set(DEFAULT_BROKERS.slice(0, 6).map(b => b.id))
  );
  const [brokerSearch, setBrokerSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [newBrokerInput, setNewBrokerInput] = useState("");

  // Consent Checkboxes
  const [perjuryConsent, setPerjuryConsent] = useState(false);
  const [lpoaConsent, setLpoaConsent] = useState(false);
  const [revocationConsent, setRevocationConsent] = useState(false);

  // E-Signature State
  const [sigMode, setSigMode] = useState("draw"); // 'draw' | 'type'
  const [typedSignature, setTypedSignature] = useState(initialData.fullName || "Jane R. Doe");
  const [drawnSignatureData, setDrawnSignatureData] = useState(null);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeHistory, setStrokeHistory] = useState([]);

  // Audit Metadata (Captured upon load & submission)
  const [auditMetadata, setAuditMetadata] = useState({
    clientIp: "198.51.100.42",
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Mozilla/5.0 Client',
    timestampUtc: new Date().toISOString(),
    auditHash: "LPOA-" + Math.random().toString(36).substring(2, 9).toUpperCase() + "-" + new Date().getFullYear(),
  });

  // Submission Flow & Inspection
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [inspectedBroker, setInspectedBroker] = useState(null);

  // Expiration calculation (1 year from now)
  const expirationDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }, []);

  const formattedAddress = useMemo(() => {
    const parts = [street, city, stateRegion, postalCode, country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "Address not specified";
  }, [street, city, stateRegion, postalCode, country]);

  // Keep typed signature synced if user changes name and hasn't customized typed signature
  useEffect(() => {
    if (fullName && !initialData.typedSignature) {
      setTypedSignature(fullName);
    }
  }, [fullName]);

  // Handle Canvas Resizing & Resolution
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && sigMode === 'draw') {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#0f172a';
    }
  }, [sigMode]);

  // Email Tag Operations
  const handleAddEmail = (e) => {
    if (e) e.preventDefault();
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) return;
    
    // Basic email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    if (emails.includes(trimmed)) {
      setEmailError("This email has already been added");
      return;
    }

    setEmails([...emails, trimmed]);
    setEmailInput("");
    setEmailError("");
  };

  const handleRemoveEmail = (indexToRemove) => {
    setEmails(emails.filter((_, idx) => idx !== indexToRemove));
  };

  // Broker Filtering
  const categories = useMemo(() => {
    const cats = new Set(brokers.map(b => b.category));
    return ["All", ...Array.from(cats)];
  }, [brokers]);

  const filteredBrokers = useMemo(() => {
    return brokers.filter(broker => {
      const matchesCategory = selectedCategory === "All" || broker.category === selectedCategory;
      const matchesSearch = broker.name.toLowerCase().includes(brokerSearch.toLowerCase()) ||
                            broker.domain.toLowerCase().includes(brokerSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [brokers, selectedCategory, brokerSearch]);

  const toggleBroker = (id) => {
    const next = new Set(selectedBrokerIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedBrokerIds(next);
  };

  const handleSelectAllBrokers = () => {
    setSelectedBrokerIds(new Set(brokers.map(b => b.id)));
  };

  const handleDeselectAllBrokers = () => {
    setSelectedBrokerIds(new Set());
  };

  const handleAddCustomBroker = (e) => {
    e.preventDefault();
    const clean = newBrokerInput.trim();
    if (!clean) return;
    const id = clean.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const newEntry = {
      id,
      name: clean,
      domain: clean.includes('.') ? clean : `${clean}.com`,
      category: 'Custom Platform',
      email: `privacy@${clean.includes('.') ? clean : `${clean}.com`}`,
      slaDays: 30
    };
    setBrokers(prev => [...prev, newEntry]);
    setSelectedBrokerIds(prev => new Set([...prev, id]));
    setNewBrokerInput("");
  };

  // Canvas Drawing Handlers
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setDrawnSignatureData(canvas.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDrawnSignatureData(null);
  };

  // File Upload Handlers
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIdFile({
        name: file.name,
        size: (file.size / 1024).toFixed(1) + " KB",
        type: file.type,
      });
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setIdFile({
        name: file.name,
        size: (file.size / 1024).toFixed(1) + " KB",
        type: file.type,
      });
    }
  };

  // Form Validation
  const hasValidSignature = sigMode === 'draw' ? Boolean(drawnSignatureData) : Boolean(typedSignature.trim());
  const isFormValid =
    fullName.trim().length > 1 &&
    emails.length > 0 &&
    street.trim().length > 3 &&
    city.trim().length > 1 &&
    selectedBrokerIds.size > 0 &&
    perjuryConsent &&
    lpoaConsent &&
    revocationConsent &&
    hasValidSignature;

  // Final Form Submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);

    const executionTimestamp = new Date().toISOString();
    const finalMetadata = {
      ...auditMetadata,
      timestampUtc: executionTimestamp,
    };

    const payload = {
      principal: {
        fullName,
        emails,
        phone,
        address: formattedAddress,
        idDocumentAttached: Boolean(idFile),
      },
      agent: {
        companyName,
        companyAddress,
        companyEmail,
      },
      selectedBrokers: brokers.filter(b => selectedBrokerIds.has(b.id)),
      statutoryBases: [
        "GDPR Article 17 (Right to Erasure)",
        "CCPA/CPRA § 1798.105 (Right to Delete)",
        "India DPDP Act 2023 § 12 (Right to Erasure)"
      ],
      signature: {
        mode: sigMode,
        data: sigMode === 'draw' ? drawnSignatureData : `/s/ ${typedSignature.trim()}`,
      },
      auditTrail: finalMetadata,
      expirationDate,
    };

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setSubmittedData(payload);
      if (onSubmit) onSubmit(payload);
    }, 1200);
  };

  const handleResetForm = () => {
    setIsSubmitted(false);
    setSubmittedData(null);
    clearCanvas();
    if (onReset) onReset();
  };

  // Download agreement draft as legal text
  const handleDownloadDraft = () => {
    const docText = `
LIMITED POWER OF ATTORNEY FOR DATA ERASURE AND STATUTORY PRIVACY RIGHTS
========================================================================
Reference Audit Hash: ${auditMetadata.auditHash}
Generated: ${new Date().toUTCString()}

1. PRINCIPAL (CUSTOMER):
   Legal Name:       ${fullName || '[Customer Name]'}
   Mailing Address:  ${formattedAddress}
   Associated Email: ${emails.join(', ') || '[None provided]'}
   Phone Number:     ${phone || '[Not provided]'}

2. APPOINTMENT OF AGENT:
   The Principal hereby designates and appoints ${companyName} ("Agent"),
   located at ${companyAddress}, as their true and lawful attorney-in-fact
   and authorized agent.

3. SCOPE OF STATUTORY AUTHORITY:
   Agent is authorized strictly and solely to:
   a. Exercise statutory consumer privacy rights, including formal requests to
      delete, de-index, halt sales/sharing of personal data under applicable
      statutes (including GDPR Art. 17, CCPA § 1798.105, DPDP Act 2023).
   b. Submit formal requests to target data brokers and aggregators (${selectedBrokerIds.size} platforms targeted).
   c. Handle and respond to verification challenges and demand deletion compliance certificates.

4. LIMITATIONS OF AUTHORITY:
   This Limited Power of Attorney explicitly grants NO authority over financial accounts,
   banking credentials, contracts, transactional management, or legal representation in court.

5. TERM AND REVOCATION:
   This authorization takes effect immediately upon execution and remains effective
   until ${expirationDate} or until revoked in writing by the Principal.

IN WITNESS WHEREOF:
Signature: ${sigMode === 'draw' ? '[Digitally Drawn E-Signature Stored]' : `/s/ ${typedSignature}`}
Date: ${auditMetadata.timestampUtc}
IP Address at Execution: ${auditMetadata.clientIp}
Agent Hash: ${auditMetadata.auditHash}
========================================================================
    `.trim();

    const blob = new Blob([docText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `LPOA-Data-Deletion-${auditMetadata.auditHash}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Render Post-Submission Status Dashboard
  if (isSubmitted && submittedData) {
    const selectedBrokerList = submittedData.selectedBrokers;
    return (
      <div className="lpoa-wrapper">
        <div className="lpoa-container">
          <div className="lpoa-status-container">
            <div className="lpoa-success-badge-icon">✓</div>
            <div className="lpoa-badge">
              <span className="lpoa-badge-dot"></span>
              Execution Confirmed & Dispatched
            </div>
            <h1 className="lpoa-title" style={{ fontSize: '2.25rem' }}>Limited Power of Attorney Executed</h1>
            <p className="lpoa-subtitle">
              Your legal mandate granting <strong>{companyName}</strong> authorized agency has been cryptographically signed
              and queued for delivery to <strong>{selectedBrokerList.length} data brokers</strong>.
            </p>

            {/* 4-Step Statutory Pipeline Tracker */}
            <div className="lpoa-pipeline-stepper">
              <div className="lpoa-pipe-step done">
                <div className="lpoa-pipe-circle">1</div>
                <div className="lpoa-pipe-title">Authorized</div>
                <div className="lpoa-pipe-sub">LPOA E-Signed</div>
              </div>
              <div className="lpoa-pipe-step active">
                <div className="lpoa-pipe-circle">2</div>
                <div className="lpoa-pipe-title">Notice Dispatched</div>
                <div className="lpoa-pipe-sub">Automated Queue</div>
              </div>
              <div className="lpoa-pipe-step">
                <div className="lpoa-pipe-circle">3</div>
                <div className="lpoa-pipe-title">Awaiting Response</div>
                <div className="lpoa-pipe-sub">30-45 Day SLA</div>
              </div>
              <div className="lpoa-pipe-step">
                <div className="lpoa-pipe-circle">4</div>
                <div className="lpoa-pipe-title">Erasure Confirmed</div>
                <div className="lpoa-pipe-sub">Audit Receipt</div>
              </div>
            </div>

            {/* Target Dispatch Matrix */}
            <div style={{ textAlign: 'left', marginTop: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.125rem', color: '#f8fafc' }}>
                  Statutory Dispatches ({selectedBrokerList.length})
                </h3>
                <span style={{ fontSize: '0.8125rem', color: '#38bdf8', fontFamily: 'JetBrains Mono' }}>
                  Ref: {submittedData.auditTrail.auditHash}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedBrokerList.map((broker) => (
                  <div
                    key={broker.id}
                    style={{
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9375rem' }}>{broker.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        To: {broker.email} • Statutory SLA: {broker.slaDays} Days
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span
                        style={{
                          background: 'rgba(6, 182, 212, 0.15)',
                          color: '#38bdf8',
                          fontSize: '0.75rem',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontWeight: 600,
                        }}
                      >
                        Notice Outbox Queued
                      </span>
                      <button
                        className="lpoa-btn-sm"
                        onClick={() => {
                          setInspectedBroker(broker);
                          setShowEmailModal(true);
                        }}
                      >
                        Inspect Notice
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '2.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="lpoa-submit-btn" style={{ maxWidth: '280px' }} onClick={handleDownloadDraft}>
                ⬇ Download Signed LPOA
              </button>
              <button
                className="lpoa-btn-sm"
                style={{ padding: '14px 24px', fontSize: '0.9375rem', borderRadius: '12px' }}
                onClick={handleResetForm}
              >
                Submit New Request
              </button>
            </div>
          </div>
        </div>

        {/* Outbound Notice Inspection Modal */}
        {showEmailModal && inspectedBroker && (
          <div className="lpoa-modal-overlay" onClick={() => setShowEmailModal(false)}>
            <div className="lpoa-modal-card" onClick={e => e.stopPropagation()}>
              <div className="lpoa-modal-header">
                <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '1rem' }}>
                  Outbound Legal Notice Preview
                </div>
                <button
                  className="lpoa-email-chip-remove"
                  onClick={() => setShowEmailModal(false)}
                  style={{ fontSize: '1.25rem' }}
                >
                  ✕
                </button>
              </div>
              <div className="lpoa-modal-body">
                <div className="lpoa-email-preview-headers">
                  <div><strong>To:</strong> {inspectedBroker.email}</div>
                  <div><strong>From:</strong> {companyEmail} (Authorized Privacy Agent)</div>
                  <div>
                    <strong>Subject:</strong> Formal Data Erasure Request - Authorized Agent Notice [Ref: {submittedData.auditTrail.auditHash}]
                  </div>
                  <div>
                    <strong>Attachment:</strong> Signed_LPOA_{submittedData.auditTrail.auditHash}.pdf (SHA-256 Verified)
                  </div>
                </div>

                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.7' }}>
{`Dear Data Protection Officer / Privacy Officer at ${inspectedBroker.name},

We represent ${submittedData.principal.fullName} ("Principal") as their duly authorized agent under applicable data protection legislation, including:
- California Consumer Privacy Act (CCPA/CPRA § 1798.105 & § 1798.135)
- General Data Protection Regulation (GDPR Article 17 "Right to Erasure")
- India Digital Personal Data Protection Act (DPDP Act § 12)

Pursuant to the attached Limited Power of Attorney (LPOA) executed by the Principal on ${submittedData.auditTrail.timestampUtc}, we hereby submit a formal, legally binding request for the permanent deletion and de-indexing of all personal records, identifiers, consumer profiles, and behavioral data associated with:

Full Legal Name: ${submittedData.principal.fullName}
Known Associated Emails: ${submittedData.principal.emails.join(', ')}
Phone Number: ${submittedData.principal.phone}
Mailing Address: ${submittedData.principal.address}

Please acknowledge receipt of this demand and confirm completion of erasure within your statutory deadline (${inspectedBroker.slaDays} calendar days).

Authorized Agent Representation:
${companyName}
Agent Officer Desk: ${companyEmail}
Digital Audit ID: ${submittedData.auditTrail.auditHash}`}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Main Authorization Form Layout
  return (
    <div className="lpoa-wrapper">
      <div className="lpoa-container">
        {/* Header Section */}
        <header className="lpoa-header">
          <div className="lpoa-badge">
            <span className="lpoa-badge-dot"></span>
            Statutory Privacy Agency Mandate
          </div>
          <h1 className="lpoa-title">Authorize Data Deletion Request</h1>
          <p className="lpoa-subtitle">
            Grant <strong>{companyName}</strong> a Limited Power of Attorney (LPOA) to demand the permanent deletion,
            opt-out, and de-indexing of your personal records across target data brokers.
          </p>

          <div className="lpoa-statute-tags">
            <span className="lpoa-statute-pill">GDPR Art. 17 (Right to Erasure)</span>
            <span className="lpoa-statute-pill">CCPA/CPRA § 1798.105 (Right to Delete)</span>
            <span className="lpoa-statute-pill">India DPDP Act § 12 (Erasure of Data)</span>
            <span className="lpoa-statute-pill">100% Revocable at Any Time</span>
          </div>
        </header>

        {/* Section A: Scope & Authorization Notice */}
        <section className="lpoa-scope-grid">
          <div className="lpoa-scope-card grant">
            <div className="lpoa-scope-header">
              <div className="lpoa-scope-icon-wrap">🛡️</div>
              <h2 className="lpoa-scope-title">What This LPOA Grants</h2>
            </div>
            <ul className="lpoa-scope-list">
              <li>Authorizes <strong>{companyName}</strong> to submit formal data deletion and opt-out demands solely on your behalf.</li>
              <li>Empowers us to communicate with broker privacy desks and receive formal erasure compliance receipts.</li>
              <li>Enables challenge handling when aggregators demand identity validation to execute erasure.</li>
            </ul>
          </div>

          <div className="lpoa-scope-card limit">
            <div className="lpoa-scope-header">
              <div className="lpoa-scope-icon-wrap">⚠️</div>
              <h2 className="lpoa-scope-title">Explicit Statutory Limits</h2>
            </div>
            <ul className="lpoa-scope-list">
              <li><strong>NO financial access:</strong> Cannot manage banking, initiate transactions, or touch financial assets.</li>
              <li><strong>NO credential access:</strong> Cannot view or manage passwords, security codes, or private login accounts.</li>
              <li><strong>NO courtroom representation:</strong> Authority is strictly confined to administrative data deletion and privacy opt-outs.</li>
            </ul>
          </div>
        </section>

        {/* Main 2-Column Grid */}
        <div className="lpoa-main-grid">
          {/* Left Column: Input Forms */}
          <form onSubmit={handleSubmit}>
            {/* 1. Target Data Brokers */}
            <div className="lpoa-section-card">
              <div className="lpoa-section-heading-wrap">
                <div>
                  <div className="lpoa-section-num">Section 1 of 3</div>
                  <h2 className="lpoa-section-title">Target Data Brokers & Platforms</h2>
                  <p className="lpoa-section-desc">Select the aggregator registries and platforms to receive formal erasure notices.</p>
                </div>
                <span style={{ fontSize: '0.8125rem', color: '#38bdf8', fontWeight: 600 }}>
                  {selectedBrokerIds.size} Selected
                </span>
              </div>

              <div className="lpoa-broker-controls">
                <div className="lpoa-broker-search-row">
                  <input
                    type="text"
                    className="lpoa-broker-search"
                    placeholder="Search brokers (e.g., Whitepages, Spokeo)..."
                    value={brokerSearch}
                    onChange={(e) => setBrokerSearch(e.target.value)}
                  />
                  <div className="lpoa-broker-btn-group">
                    <button type="button" className="lpoa-btn-sm" onClick={handleSelectAllBrokers}>
                      Select All
                    </button>
                    <button type="button" className="lpoa-btn-sm" onClick={handleDeselectAllBrokers}>
                      Deselect
                    </button>
                  </div>
                </div>

                <div className="lpoa-category-pills">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`lpoa-cat-pill ${selectedCategory === cat ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Broker Grid */}
              <div className="lpoa-broker-grid">
                {filteredBrokers.map((broker) => {
                  const isChecked = selectedBrokerIds.has(broker.id);
                  return (
                    <label key={broker.id} className={`lpoa-broker-item ${isChecked ? 'selected' : ''}`}>
                      <input
                        type="checkbox"
                        className="lpoa-broker-checkbox"
                        checked={isChecked}
                        onChange={() => toggleBroker(broker.id)}
                      />
                      <div className="lpoa-broker-info">
                        <span className="lpoa-broker-name">{broker.name}</span>
                        <span className="lpoa-broker-sub">{broker.category} • {broker.slaDays}d SLA</span>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Custom Broker Adder */}
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="lpoa-input"
                  style={{ flex: 1, padding: '8px 12px', fontSize: '0.8125rem' }}
                  placeholder="Add custom broker domain (e.g. brokerdomain.com)"
                  value={newBrokerInput}
                  onChange={(e) => setNewBrokerInput(e.target.value)}
                />
                <button type="button" className="lpoa-btn-sm" onClick={handleAddCustomBroker}>
                  + Add Broker
                </button>
              </div>
            </div>

            {/* 2. Identification & Identity Proof */}
            <div className="lpoa-section-card">
              <div className="lpoa-section-heading-wrap">
                <div>
                  <div className="lpoa-section-num">Section 2 of 3</div>
                  <h2 className="lpoa-section-title">Principal Identification & Proof</h2>
                  <p className="lpoa-section-desc">
                    Data aggregators are legally obligated to match records before purging them from indices.
                  </p>
                </div>
              </div>

              <div className="lpoa-form-group">
                <label className="lpoa-label">
                  <span>Full Legal Name</span>
                  <span className="lpoa-label-hint">Must match public consumer records</span>
                </label>
                <input
                  type="text"
                  className="lpoa-input"
                  placeholder="e.g. Jane Rebecca Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              {/* Known Associated Emails Multi-Chip */}
              <div className="lpoa-form-group">
                <label className="lpoa-label">
                  <span>Known Associated Emails ({emails.length})</span>
                  <span className="lpoa-label-hint">Brokers index users by personal, school, and work emails</span>
                </label>
                <div className="lpoa-email-tags-box">
                  {emails.map((email, idx) => (
                    <span key={idx} className="lpoa-email-chip">
                      {email}
                      <button
                        type="button"
                        className="lpoa-email-chip-remove"
                        onClick={() => handleRemoveEmail(idx)}
                        title="Remove email"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="email"
                    className="lpoa-email-input"
                    placeholder="Type email and press Enter..."
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      setEmailError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddEmail();
                      }
                    }}
                  />
                  <button type="button" className="lpoa-btn-sm" onClick={handleAddEmail}>
                    + Add
                  </button>
                </div>
                {emailError && (
                  <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>{emailError}</span>
                )}
              </div>

              {/* Phone & Address */}
              <div className="lpoa-form-group">
                <label className="lpoa-label">Primary Contact Telephone</label>
                <input
                  type="tel"
                  className="lpoa-input"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="lpoa-form-group">
                <label className="lpoa-label">Mailing Street Address</label>
                <input
                  type="text"
                  className="lpoa-input"
                  placeholder="Street address or P.O. Box"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  required
                />
              </div>

              <div className="lpoa-form-row cols-3">
                <div className="lpoa-form-group" style={{ marginBottom: 0 }}>
                  <label className="lpoa-label">City</label>
                  <input
                    type="text"
                    className="lpoa-input"
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>
                <div className="lpoa-form-group" style={{ marginBottom: 0 }}>
                  <label className="lpoa-label">State / Region</label>
                  <input
                    type="text"
                    className="lpoa-input"
                    placeholder="State"
                    value={stateRegion}
                    onChange={(e) => setStateRegion(e.target.value)}
                  />
                </div>
                <div className="lpoa-form-group" style={{ marginBottom: 0 }}>
                  <label className="lpoa-label">ZIP Code</label>
                  <input
                    type="text"
                    className="lpoa-input"
                    placeholder="Postal Code"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                  />
                </div>
              </div>

              {/* Verification File Upload (Optional) */}
              <div style={{ marginTop: '1.25rem' }}>
                <label className="lpoa-label">
                  <span>Identity Verification Document (Optional)</span>
                  <span className="lpoa-label-hint">For strict brokers demanding proof of residency</span>
                </label>

                <div
                  className={`lpoa-upload-box ${isDragging ? 'dragging' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileChange}
                  />
                  <div className="lpoa-upload-icon">📄</div>
                  <div className="lpoa-upload-label">
                    {idFile ? "Replace uploaded document" : "Click or drag ID document / utility bill"}
                  </div>
                  <div className="lpoa-upload-sub">Supports PDF, PNG, JPG (Max 10MB)</div>
                </div>

                {idFile && (
                  <div className="lpoa-uploaded-file-card">
                    <div className="lpoa-uploaded-file-info">
                      <span>✓</span>
                      <div>
                        <div className="lpoa-uploaded-file-name">{idFile.name}</div>
                        <div className="lpoa-uploaded-file-size">{idFile.size}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="lpoa-email-chip-remove"
                      onClick={() => setIdFile(null)}
                      title="Remove file"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="lpoa-redaction-notice">
                  <span>🔒</span>
                  <div>
                    <strong>Privacy Redaction Notice:</strong> Before uploading, black out or redact all sensitive
                    government ID numbers, SSN, driver license numbers, and photo IDs. Brokers only need proof of name and address.
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Digital Execution & E-Signature */}
            <div className="lpoa-section-card">
              <div className="lpoa-section-heading-wrap">
                <div>
                  <div className="lpoa-section-num">Section 3 of 3</div>
                  <h2 className="lpoa-section-title">Digital Execution & E-Signature</h2>
                  <p className="lpoa-section-desc">Sign electronically under ESIGN Act and Uniform Electronic Transactions Act (UETA).</p>
                </div>
              </div>

              {/* Signature Mode Toggle */}
              <div className="lpoa-sig-mode-tabs">
                <button
                  type="button"
                  className={`lpoa-sig-tab ${sigMode === 'draw' ? 'active' : ''}`}
                  onClick={() => setSigMode('draw')}
                >
                  ✍️ Draw Signature
                </button>
                <button
                  type="button"
                  className={`lpoa-sig-tab ${sigMode === 'type' ? 'active' : ''}`}
                  onClick={() => setSigMode('type')}
                >
                  ⌨️ Type Digital Signature
                </button>
              </div>

              {/* Draw Pad */}
              {sigMode === 'draw' ? (
                <div>
                  <div className="lpoa-canvas-container">
                    <canvas
                      ref={canvasRef}
                      className="lpoa-canvas"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                  </div>
                  <div className="lpoa-canvas-actions">
                    <span className="lpoa-canvas-hint">Draw your legal signature inside the box above</span>
                    <button type="button" className="lpoa-btn-sm" onClick={clearCanvas}>
                      Clear Signature
                    </button>
                  </div>
                </div>
              ) : (
                /* Type Pad */
                <div>
                  <input
                    type="text"
                    className="lpoa-input"
                    placeholder="Type legal signature"
                    value={typedSignature}
                    onChange={(e) => setTypedSignature(e.target.value)}
                  />
                  <div className="lpoa-typed-sig-preview">
                    {typedSignature ? `/s/ ${typedSignature}` : '/s/ [Your Legal Name]'}
                  </div>
                </div>
              )}

              {/* Consent Checkboxes */}
              <div className="lpoa-consent-list">
                <label className={`lpoa-consent-item ${perjuryConsent ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    className="lpoa-consent-checkbox"
                    checked={perjuryConsent}
                    onChange={(e) => setPerjuryConsent(e.target.checked)}
                  />
                  <span className="lpoa-consent-text">
                    I certify under penalty of perjury that I am the individual whose data is requested for deletion, or an authorized legal guardian.
                  </span>
                </label>

                <label className={`lpoa-consent-item ${lpoaConsent ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    className="lpoa-consent-checkbox"
                    checked={lpoaConsent}
                    onChange={(e) => setLpoaConsent(e.target.checked)}
                  />
                  <span className="lpoa-consent-text">
                    I grant <strong>{companyName}</strong> Limited Power of Attorney strictly for data deletion and opt-out requests under applicable data protection laws.
                  </span>
                </label>

                <label className={`lpoa-consent-item ${revocationConsent ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    className="lpoa-consent-checkbox"
                    checked={revocationConsent}
                    onChange={(e) => setRevocationConsent(e.target.checked)}
                  />
                  <span className="lpoa-consent-text">
                    I understand that I may revoke this authorization at any time in writing, and that authority is non-transferable to financial or non-privacy matters.
                  </span>
                </label>
              </div>

              {/* Audit Metadata Stamp */}
              <div className="lpoa-audit-box">
                <div className="lpoa-audit-item">
                  <span className="lpoa-audit-key">Execution Timestamp (UTC)</span>
                  <span className="lpoa-audit-val">{auditMetadata.timestampUtc}</span>
                </div>
                <div className="lpoa-audit-item">
                  <span className="lpoa-audit-key">Cryptographic Reference ID</span>
                  <span className="lpoa-audit-val">{auditMetadata.auditHash}</span>
                </div>
                <div className="lpoa-audit-item">
                  <span className="lpoa-audit-key">Authorized Agent IP</span>
                  <span className="lpoa-audit-val">{auditMetadata.clientIp}</span>
                </div>
                <div className="lpoa-audit-item">
                  <span className="lpoa-audit-key">Security Envelope</span>
                  <span className="lpoa-audit-val">SHA-256 Non-Repudiation</span>
                </div>
              </div>

              {/* Sign & Submit Button */}
              <button
                type="submit"
                className="lpoa-submit-btn"
                disabled={!isFormValid || isSubmitting}
              >
                {isSubmitting ? (
                  <span>Generating Signed LPOA & Dispatching...</span>
                ) : (
                  <span>Sign & Authorize Data Deletion Request</span>
                )}
              </button>
            </div>
          </form>

          {/* Right Column: Dynamic Live Legal Document Preview */}
          <div className="lpoa-preview-sticky">
            <div className="lpoa-parchment">
              <div className="lpoa-parchment-header">
                <div>
                  <h3 className="lpoa-doc-title">Limited Power of Attorney</h3>
                  <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>Statutory Data Erasure Mandate</div>
                </div>
                <span className="lpoa-doc-ref">{auditMetadata.auditHash}</span>
              </div>

              <div className="lpoa-parchment-body">
                <div className="lpoa-clause">
                  <div className="lpoa-clause-heading">1. Principal (Customer)</div>
                  <p className="lpoa-clause-content">
                    Name: <span className="lpoa-field-highlight">{fullName || '[Pending Entry]'}</span><br />
                    Mailing Address: <span className="lpoa-field-highlight">{formattedAddress}</span><br />
                    Associated Email(s): <span className="lpoa-field-highlight">{emails.join(', ') || '[Pending Entry]'}</span><br />
                    Contact Phone: <span className="lpoa-field-highlight">{phone || '[Pending Entry]'}</span>
                  </p>
                </div>

                <div className="lpoa-clause">
                  <div className="lpoa-clause-heading">2. Appointment of Agent</div>
                  <p className="lpoa-clause-content">
                    The Principal hereby designates and appoints <strong>{companyName}</strong> ("Agent"),
                    located at {companyAddress}, as their true and lawful attorney-in-fact and authorized agent.
                  </p>
                </div>

                <div className="lpoa-clause">
                  <div className="lpoa-clause-heading">3. Scope of Statutory Authority</div>
                  <p className="lpoa-clause-content">
                    Agent is authorized strictly and solely to:
                    <br />a. Exercise statutory privacy rights, including requests to delete, opt-out, de-index, or halt the sale/sharing of personal data on behalf of Principal under GDPR Article 17, CCPA/CPRA § 1798.105, and DPDP Act.
                    <br />b. Communicate, negotiate, and submit formal notices to target data brokers ({selectedBrokerIds.size} designated platforms).
                    <br />c. Receive verification challenges and provide confirmation of deletion completion.
                  </p>
                </div>

                <div className="lpoa-clause">
                  <div className="lpoa-clause-heading">4. Limitations</div>
                  <p className="lpoa-clause-content">
                    This Limited Power of Attorney grants <strong>NO authority</strong> over financial accounts,
                    contractual obligations, asset management, login credentials, or legal representation in court.
                  </p>
                </div>

                <div className="lpoa-clause">
                  <div className="lpoa-clause-heading">5. Term and Revocation</div>
                  <p className="lpoa-clause-content">
                    This authorization becomes effective immediately upon electronic execution and shall remain
                    in effect until <strong>{expirationDate}</strong> or until revoked in writing by the Principal.
                  </p>
                </div>

                {/* E-Signature Box */}
                <div className="lpoa-parchment-sig-box">
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#0f172a' }}>
                    IN WITNESS WHEREOF (Principal Execution):
                  </div>
                  <div className="lpoa-sig-render">
                    {sigMode === 'draw' && drawnSignatureData ? (
                      <img src={drawnSignatureData} alt="Principal Signature" className="lpoa-sig-img" />
                    ) : sigMode === 'type' && typedSignature ? (
                      <div className="lpoa-sig-typed">/s/ {typedSignature}</div>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8125rem' }}>
                        [Awaiting signature execution...]
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#64748b', fontFamily: 'JetBrains Mono' }}>
                    Date: {auditMetadata.timestampUtc}<br />
                    IP Address: {auditMetadata.clientIp}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1rem', borderTop: '1px solid #cbd5e1', paddingTop: '0.75rem' }}>
                <button
                  type="button"
                  className="lpoa-btn-sm"
                  style={{ width: '100%', background: '#e2e8f0', color: '#1e293b' }}
                  onClick={handleDownloadDraft}
                >
                  ⬇ Download Legal Draft (.txt)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
