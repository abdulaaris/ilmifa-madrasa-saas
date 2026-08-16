import React, { useState } from 'react';
import { tenantService } from '../../services/tenantService';
import { domainService } from '../../services/domainService';
import { ALL_MODULES, DEFAULT_BRANDING } from '../../config/constants';
import { MadrasaModule, MadrasaTenant } from '../../types';
import { X, Check, Copy, ExternalLink, ArrowRight, ArrowLeft, Building2, User, Palette, Grid, Link as LinkIcon, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (tenant: MadrasaTenant) => void;
}

export const CreateMadrasaModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  const [principalName, setPrincipalName] = useState('');
  const [principalEmail, setPrincipalEmail] = useState('');
  const [principalPassword, setPrincipalPassword] = useState('');

  const [primaryColor, setPrimaryColor] = useState(DEFAULT_BRANDING.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_BRANDING.secondaryColor);
  const [welcomeMessage, setWelcomeMessage] = useState(DEFAULT_BRANDING.welcomeMessage);

  const [enabledModules, setEnabledModules] = useState<MadrasaModule[]>(ALL_MODULES.map(m => m.id));

  const [slug, setSlug] = useState('');
  const [tenantIdPreview, setTenantIdPreview] = useState('');

  // Result state
  const [createdTenant, setCreatedTenant] = useState<MadrasaTenant | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!shortName) {
      setShortName(val.substring(0, 10));
    }
    const generatedSlug = domainService.generateSlug(val);
    setSlug(generatedSlug);
  };

  const handleNextStep1 = () => {
    if (!name || !email || !phone) {
      setError('Please fill in Madrasa Name, Email and Phone.');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleNextStep2 = () => {
    if (!principalName || !principalEmail || !principalPassword) {
      setError('Please enter Principal Name, Email, and Password.');
      return;
    }
    if (principalPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    setError(null);
    setStep(3);
  };

  const handleNextStep3 = () => {
    setError(null);
    setStep(4);
  };

  const handleNextStep4 = () => {
    if (enabledModules.length === 0) {
      setError('Please enable at least one module.');
      return;
    }
    setError(null);

    // Generate Preview Tenant ID
    tenantService.generateTenantId().then(id => setTenantIdPreview(id));
    setStep(5);
  };

  const handleNextStep5 = () => {
    if (!slug) {
      setError('Please provide a valid slug.');
      return;
    }
    setError(null);
    setStep(6);
  };

  const toggleModule = (modId: MadrasaModule) => {
    if (enabledModules.includes(modId)) {
      setEnabledModules(enabledModules.filter(m => m !== modId));
    } else {
      setEnabledModules([...enabledModules, modId]);
    }
  };

  const handleCreateMadrasa = async () => {
    setLoading(true);
    setError(null);

    try {
      const { tenant } = await tenantService.createMadrasaTenant({
        name,
        shortName: shortName || name,
        slug,
        email,
        phone,
        address,
        principalName,
        principalEmail,
        principalPassword,
        branding: { primaryColor, secondaryColor, welcomeMessage },
        enabledModules
      });

      setCreatedTenant(tenant);
      setLoading(false);
      onSuccess(tenant);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create Madrasa';
      setError(msg);
      setLoading(false);
    }
  };

  const portalUrl = createdTenant ? domainService.generatePortalUrl(createdTenant.slug) : '';

  const copyPortalLink = () => {
    const fullUrl = `${window.location.origin}${portalUrl}/login`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        maxWidth: '680px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#252525', margin: 0 }}>
              {createdTenant ? '✓ Madrasa Created Successfully' : 'Create New Madrasa Tenant'}
            </h3>
            <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
              {createdTenant ? 'Real Tenant ID & Principal Account Provisioned' : `Step ${step} of 6 — Multi-Step Tenant Wizard`}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '6px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '24px', flex: 1 }}>
          {error && (
            <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: '13px', marginBottom: '20px' }}>
              ⚠️ {error}
            </div>
          )}

          {/* CREATION SUCCESS VIEW */}
          {createdTenant ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle2 size={36} />
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#252525', marginBottom: '4px' }}>
                {createdTenant.name}
              </h2>
              <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '24px' }}>
                Tenant ID: <strong>{createdTenant.id}</strong> • Slug: <strong>{createdTenant.slug}</strong>
              </div>

              <div style={{ backgroundColor: '#FAF8F5', border: '1px solid #EEE0CC', borderRadius: '12px', padding: '20px', textAlign: 'left', marginBottom: '24px' }}>
                <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px' }}>Generated Customer Portal URL</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#7B2525', wordBreak: 'break-all' }}>
                  {window.location.origin}{portalUrl}/login
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E2DDD5', fontSize: '13px' }}>
                  <div>
                    <div style={{ color: '#666', fontSize: '11px' }}>Principal Account Email</div>
                    <div style={{ fontWeight: 600, color: '#252525' }}>{createdTenant.principalEmail}</div>
                  </div>
                  <div>
                    <div style={{ color: '#666', fontSize: '11px' }}>Principal Status</div>
                    <div style={{ fontWeight: 600, color: '#059669' }}>Active (Password Configured)</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a 
                  href={`${portalUrl}/login`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn btn-primary"
                  style={{ textDecoration: 'none' }}
                >
                  <ExternalLink size={16} />
                  <span>Open Customer Portal</span>
                </a>
                <button onClick={copyPortalLink} className="btn btn-outline">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copied ? 'Link Copied!' : 'Copy Portal Link'}</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* STEP 1: MADRASA DETAILS */}
              {step === 1 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#7B2525', fontWeight: 600, fontSize: '15px' }}>
                    <Building2 size={18} />
                    <span>STEP 1 — Madrasa Details</span>
                  </div>
                  <div style={{ display: 'grid', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Madrasa Name *</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="e.g. Noorul Hayath Islamic Academy"
                        value={name}
                        onChange={e => handleNameChange(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Short Name</label>
                        <input 
                          type="text" 
                          className="input-field" 
                          placeholder="e.g. Noorul Hayath"
                          value={shortName}
                          onChange={e => setShortName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Official Phone *</label>
                        <input 
                          type="text" 
                          className="input-field" 
                          placeholder="+91 98765 43210"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Official Email *</label>
                      <input 
                        type="email" 
                        className="input-field" 
                        placeholder="info@noorulhayath.org"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Address</label>
                      <textarea 
                        className="input-field" 
                        rows={2}
                        placeholder="Street Address, City, State, Pin Code"
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: PRINCIPAL DETAILS */}
              {step === 2 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#7B2525', fontWeight: 600, fontSize: '15px' }}>
                    <User size={18} />
                    <span>STEP 2 — Principal Account Provisioning</span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
                    Creates a real Firebase Authentication account for the Madrasa Principal.
                  </p>
                  <div style={{ display: 'grid', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Principal Full Name *</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="Maulana Abdul Rahman"
                        value={principalName}
                        onChange={e => setPrincipalName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Principal Login Email *</label>
                      <input 
                        type="email" 
                        className="input-field" 
                        placeholder="principal@noorulhayath.org"
                        value={principalEmail}
                        onChange={e => setPrincipalEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Initial Login Password *</label>
                      <input 
                        type="password" 
                        className="input-field" 
                        placeholder="Minimum 6 characters"
                        value={principalPassword}
                        onChange={e => setPrincipalPassword(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: BRANDING */}
              {step === 3 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#7B2525', fontWeight: 600, fontSize: '15px' }}>
                    <Palette size={18} />
                    <span>STEP 3 — Custom Portal Branding</span>
                  </div>
                  <div style={{ display: 'grid', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Primary Theme Color</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} style={{ width: '40px', height: '36px', border: 'none', cursor: 'pointer', borderRadius: '4px' }} />
                          <input type="text" className="input-field" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Secondary Accent Color</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} style={{ width: '40px', height: '36px', border: 'none', cursor: 'pointer', borderRadius: '4px' }} />
                          <input type="text" className="input-field" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Portal Welcome Message</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="Welcome to Noorul Hayath Madrasa Management Portal"
                        value={welcomeMessage}
                        onChange={e => setWelcomeMessage(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: MODULES */}
              {step === 4 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#7B2525', fontWeight: 600, fontSize: '15px' }}>
                    <Grid size={18} />
                    <span>STEP 4 — Select Enabled SaaS Modules</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                    {ALL_MODULES.map(mod => {
                      const selected = enabledModules.includes(mod.id);
                      return (
                        <div 
                          key={mod.id}
                          onClick={() => toggleModule(mod.id)}
                          style={{
                            padding: '12px',
                            borderRadius: '10px',
                            border: `1px solid ${selected ? '#7B2525' : '#E5E7EB'}`,
                            backgroundColor: selected ? 'rgba(123, 37, 37, 0.04)' : '#FFF',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '4px',
                            border: `1px solid ${selected ? '#7B2525' : '#D1D5DB'}`,
                            backgroundColor: selected ? '#7B2525' : '#FFF',
                            color: '#FFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: '2px',
                            flexShrink: 0
                          }}>
                            {selected && <Check size={12} />}
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#252525' }}>{mod.label}</div>
                            <div style={{ fontSize: '11px', color: '#6B7280', lineHeight: '1.3' }}>{mod.description}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 5: PORTAL & SLUG */}
              {step === 5 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#7B2525', fontWeight: 600, fontSize: '15px' }}>
                    <LinkIcon size={18} />
                    <span>STEP 5 — Tenant Portal URL Configuration</span>
                  </div>
                  <div style={{ display: 'grid', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Tenant ID (Auto-Generated)</label>
                      <input type="text" className="input-field" value={tenantIdPreview} readOnly style={{ backgroundColor: '#F3F4F6', fontWeight: 600, color: '#374151' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Portal Slug (URL Safe)</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        value={slug}
                        onChange={e => setSlug(domainService.generateSlug(e.target.value))}
                      />
                    </div>
                    <div style={{ backgroundColor: '#FAF8F5', border: '1px solid #EEE0CC', borderRadius: '10px', padding: '14px', fontSize: '13px' }}>
                      <div style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>Customer Portal Access URL</div>
                      <div style={{ fontWeight: 600, color: '#7B2525' }}>
                        {window.location.origin}/m/{slug}/login
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6: REVIEW */}
              {step === 6 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#7B2525', fontWeight: 600, fontSize: '15px' }}>
                    <CheckCircle2 size={18} />
                    <span>STEP 6 — Final Review & Provisioning</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px', backgroundColor: '#FAF9F7', padding: '16px', borderRadius: '12px', border: '1px solid #E2DDD5' }}>
                    <div>
                      <div style={{ color: '#6B7280', fontSize: '11px' }}>Madrasa Name</div>
                      <div style={{ fontWeight: 600, color: '#252525' }}>{name}</div>
                    </div>
                    <div>
                      <div style={{ color: '#6B7280', fontSize: '11px' }}>Official Email</div>
                      <div style={{ fontWeight: 600, color: '#252525' }}>{email}</div>
                    </div>
                    <div>
                      <div style={{ color: '#6B7280', fontSize: '11px' }}>Principal Email</div>
                      <div style={{ fontWeight: 600, color: '#252525' }}>{principalEmail}</div>
                    </div>
                    <div>
                      <div style={{ color: '#6B7280', fontSize: '11px' }}>Portal Slug</div>
                      <div style={{ fontWeight: 600, color: '#7B2525' }}>/m/{slug}</div>
                    </div>
                    <div>
                      <div style={{ color: '#6B7280', fontSize: '11px' }}>Enabled Modules</div>
                      <div style={{ fontWeight: 600, color: '#252525' }}>{enabledModules.length} Modules Active</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Controls */}
        {!createdTenant && (
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FAF9F7'
          }}>
            {step > 1 ? (
              <button onClick={() => setStep(step - 1)} className="btn btn-outline btn-sm">
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
            ) : (
              <div></div>
            )}

            {step === 1 && (
              <button onClick={handleNextStep1} className="btn btn-primary">
                <span>Next: Principal</span>
                <ArrowRight size={16} />
              </button>
            )}

            {step === 2 && (
              <button onClick={handleNextStep2} className="btn btn-primary">
                <span>Next: Branding</span>
                <ArrowRight size={16} />
              </button>
            )}

            {step === 3 && (
              <button onClick={handleNextStep3} className="btn btn-primary">
                <span>Next: Modules</span>
                <ArrowRight size={16} />
              </button>
            )}

            {step === 4 && (
              <button onClick={handleNextStep4} className="btn btn-primary">
                <span>Next: Portal URL</span>
                <ArrowRight size={16} />
              </button>
            )}

            {step === 5 && (
              <button onClick={handleNextStep5} className="btn btn-primary">
                <span>Next: Review</span>
                <ArrowRight size={16} />
              </button>
            )}

            {step === 6 && (
              <button onClick={handleCreateMadrasa} disabled={loading} className="btn btn-primary btn-lg">
                {loading ? 'Provisioning Auth & Tenant...' : 'CREATE MADRASA'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
