import React, { useState, useMemo, useCallback, useEffect } from "react";
import clsx from "clsx";
import { 
  ShieldCheck, 
  ExternalLink, 
  Building2, 
  Wallet, 
  Zap, 
  AlertTriangle, 
  FileText, 
  Scale, 
  Calculator, 
  Check, 
  Copy, 
  Info, 
  ChevronRight, 
  ArrowRight,
  Landmark,
  BadgePercent,
  Layers,
  Sparkles,
  Download,
  ArrowUpRight
} from "lucide-react";
import { soundEngine } from "../../utils/soundEngine";
import { USD_INR_RATE } from "./foreignStocksData";

const LRS_ANNUAL_LIMIT_USD = 250000;
const TCS_THRESHOLD_INR = 700000;
const TCS_RATE_ABOVE_THRESHOLD = 0.20;

const LENSES = [
  { id: "onboarding_wire", label: "1. Onboarding & Wire", icon: Building2 },
  { id: "remittance_tcs", label: "2. Remittance & TCS", icon: Calculator },
  { id: "tax_shield", label: "3. Statutory Tax Shield", icon: Scale },
];

const BROKER_PROFILES = [
  {
    id: "indmoney",
    name: "INDmoney",
    partner: "DriveWealth LLC",
    wireFee: "₹0 (Federal Bank)",
    fxMarkup: "~0.75%",
    minDeposit: "$1 (~₹88)",
    kycTime: "5 mins (Aadhaar/PAN)",
    url: "https://www.indmoney.com/us-stocks",
    badge: "Lowest Friction",
    beneficiaryName: "DriveWealth LLC (Client Custody)",
    beneficiaryBank: "Citibank N.A. New York",
    swiftBic: "CITIUS33",
    routingAba: "021000089",
    accountPlaceholder: "DW-IND-[Your 8-Digit Broker ID]",
    purposeCode: "S0001 (Portfolio Investment Abroad)"
  },
  {
    id: "vested",
    name: "Vested Finance",
    partner: "DriveWealth LLC",
    wireFee: "₹0 (Partner Bank) / Standard",
    fxMarkup: "~0.85%",
    minDeposit: "$1 (~₹88)",
    kycTime: "5 mins (Digital)",
    url: "https://vestedfinance.com",
    badge: "Direct LRS Wire",
    beneficiaryName: "DriveWealth LLC (Vested Omnibus)",
    beneficiaryBank: "Citibank N.A. New York",
    swiftBic: "CITIUS33",
    routingAba: "021000089",
    accountPlaceholder: "VEST-[Your Client Account Number]",
    purposeCode: "S0001 (Portfolio Investment Abroad)"
  },
  {
    id: "ibkr",
    name: "Interactive Brokers",
    partner: "Self-Clearing (SEC/FINRA)",
    wireFee: "₹750 - ₹1,250 (SWIFT)",
    fxMarkup: "~0.20% (Interbank)",
    minDeposit: "$0 (No min)",
    kycTime: "24-48 hrs",
    url: "https://www.interactivebrokers.co.in",
    badge: "Institutional Pro",
    beneficiaryName: "Interactive Brokers LLC",
    beneficiaryBank: "Citibank N.A. New York",
    swiftBic: "CITIUS33",
    routingAba: "021000089",
    accountPlaceholder: "U[Your 7-Digit IBKR Account ID]",
    purposeCode: "S0001 (Portfolio Investment Abroad)"
  }
];

const BANKING_CHANNELS = [
  {
    id: "fintech",
    label: "Fintech Fast-Wire (Federal / SBM Partner)",
    fixedFee: 0,
    fxSpreadPct: 0.0075,
    desc: "₹0 wire fee · ~0.75% FX markup · Same-day conversion"
  },
  {
    id: "private",
    label: "Traditional Bank SWIFT (HDFC, ICICI, SBI)",
    fixedFee: 885, // ₹750 + 18% GST
    fxSpreadPct: 0.0125,
    desc: "₹885 wire fee · ~1.25% FX markup · 24-48h processing"
  }
];

const REMITTANCE_PRESETS = [25000, 50000, 100000, 500000, 1000000];

const TAX_COMPARISON_DATA = [
  {
    metric: "LTCG Holding Period",
    domestic: "12 Months",
    us: "24 Months",
    notes: "US shares treated as unlisted foreign equities under Section 112"
  },
  {
    metric: "LTCG Tax Rate",
    domestic: "12.5% (above ₹1.25L exemption)",
    us: "12.5% (flat, no threshold exemption)",
    notes: "Rationalized post-Budget 2024 (earlier 20% with indexation)"
  },
  {
    metric: "STCG Tax Rate",
    domestic: "20% flat (Section 111A)",
    us: "Income Tax Slab Rate (up to 30%+)",
    notes: "Added to total income if sold within 24 months"
  },
  {
    metric: "Dividend Tax Treatment",
    domestic: "Taxed at individual slab rate",
    us: "25% IRS withholding + 100% Form 67 FTC",
    notes: "Claimable as Foreign Tax Credit against Indian tax liability"
  },
  {
    metric: "Currency Depreciation Alpha",
    domestic: "0% (INR denominated)",
    us: "+3.5% Annual USD/INR Tailwind",
    notes: "USD appreciation taxed at favorable 12.5% LTCG rate upon sale"
  },
  {
    metric: "Mandatory ITR Filing",
    domestic: "ITR-1 (if eligible) or ITR-2",
    us: "Mandatory ITR-2 (Schedule FA)",
    notes: "Black Money Act compliance required"
  }
];

function copyToClipboard(text, onSuccess) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      onSuccess?.();
    }).catch(() => {
      fallbackCopy(text, onSuccess);
    });
  } else {
    fallbackCopy(text, onSuccess);
  }
}

function fallbackCopy(text, onSuccess) {
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    onSuccess?.();
  } catch {
    /* ignore */
  }
}

/**
 * 🛡️ Section 5: Master Indian Investor LRS Remittance & Statutory Compliance Engine (Level 3 Elite)
 */
export function ForeignStocksRoadmap({
  simRupees = 100000,
  priorRemittancesInr = 0,
  setPriorRemittancesInr,
  simStock = null
}) {
  // ── Navigation Lens State ──
  const [activeLens, setActiveLens] = useState("onboarding_wire"); // "onboarding_wire" | "remittance_tcs" | "tax_shield"

  // ── Lens 1: Onboarding & Wire State ──
  const [selectedBrokerId, setSelectedBrokerId] = useState("indmoney");
  const [copiedField, setCopiedField] = useState(null);
  const [completedSteps, setCompletedSteps] = useState([1]); // step IDs that user checked off

  // ── Lens 2: Live LRS Remittance State ──
  const [remitAmount, setRemitAmount] = useState(() => simRupees || 100000);
  const [channelId, setChannelId] = useState("fintech");

  // Keep priorRemittances synchronized with parent store
  const priorRemittances = priorRemittancesInr;
  const setPriorRemittances = setPriorRemittancesInr || (() => {});

  // Sync remitAmount when simulator capital changes
  useEffect(() => {
    if (simRupees > 0) {
      setRemitAmount(simRupees);
    }
  }, [simRupees]);

  // ── Lens 3: Tax Shield State ──
  const [activeTaxTab, setActiveTaxTab] = useState("schedule_fa"); // "schedule_fa" | "mock_return" | "tax_showdown" | "dtaa_form67" | "estate_tax"
  const [copiedDossier, setCopiedDossier] = useState(false);
  const [copiedScheduleFa, setCopiedScheduleFa] = useState(false);

  // Selected Broker Profile for Wire Assistant
  const selectedBroker = useMemo(() => {
    return BROKER_PROFILES.find((b) => b.id === selectedBrokerId) || BROKER_PROFILES[0];
  }, [selectedBrokerId]);

  // Selected Banking Channel
  const selectedChannel = useMemo(() => {
    return BANKING_CHANNELS.find((c) => c.id === channelId) || BANKING_CHANNELS[0];
  }, [channelId]);

  // Sanitized Inputs for Calculator
  const grossInr = Math.max(0, Math.min(15000000, Number(remitAmount) || 0));
  const priorInr = Math.max(0, Math.min(15000000, Number(priorRemittances) || 0));

  // Wire and Conversion Breakdown
  const bankWireFee = selectedChannel.fixedFee;
  const fxSpreadCost = Math.round(grossInr * selectedChannel.fxSpreadPct);
  const totalOverhead = bankWireFee + fxSpreadCost;
  const netInrToUsd = Math.max(0, grossInr - totalOverhead);
  const effectiveUsd = netInrToUsd > 0 ? (netInrToUsd / USD_INR_RATE) : 0;
  const overheadPct = grossInr > 0 ? ((totalOverhead / grossInr) * 100).toFixed(2) : "0.00";

  // Section 206C(1G) TCS Mechanics
  const remainingExemption = Math.max(0, TCS_THRESHOLD_INR - priorInr);
  const tcsTaxableAmount = Math.max(0, grossInr - remainingExemption);
  const tcsPayable = Math.round(tcsTaxableAmount * TCS_RATE_ABOVE_THRESHOLD);
  const isTcsZero = tcsPayable === 0;

  // Advisory Flag: High friction on small deposits
  const isHighFriction = grossInr > 0 && parseFloat(overheadPct) >= 2.5;

  // Step toggle handler
  const handleToggleStep = (stepNum) => {
    setCompletedSteps((prev) => {
      const exists = prev.includes(stepNum);
      const next = exists ? prev.filter((s) => s !== stepNum) : [...prev, stepNum];
      soundEngine.playSuccessTone();
      return next;
    });
  };

  // 1-Click Copy helper for wire fields
  const handleCopyWireField = (fieldName, text) => {
    copyToClipboard(text, () => {
      setCopiedField(fieldName);
      soundEngine.playSuccessTone();
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  // Full Compliance Dossier Copy
  const handleCopyDossier = () => {
    const text = [
      "==================================================",
      "INDIAN INVESTOR US EQUITIES COMPLIANCE DOSSIER",
      "==================================================",
      `Date Generated: ${new Date().toISOString().split("T")[0]}`,
      `Gross Remittance: ₹${grossInr.toLocaleString("en-IN")}`,
      `Selected Bank Channel: ${selectedChannel.label}`,
      `Total Friction Drag: ₹${totalOverhead.toLocaleString("en-IN")} (${overheadPct}%)`,
      `Effective USD Received: $${effectiveUsd.toFixed(2)} (at ₹${USD_INR_RATE}/USD)`,
      `Prior Remittances this FY: ₹${priorInr.toLocaleString("en-IN")}`,
      `TCS Payable (Sec 206C(1G)): ₹${tcsPayable.toLocaleString("en-IN")} (${isTcsZero ? "0% - Under ₹7L Exemption" : "20% on Excess"})`,
      "",
      "STATUTORY TAX FILING CHECKLIST:",
      "1. Mandatory ITR-2/ITR-3 filing: Schedule FA (Foreign Assets Table A3) disclosure is legally required.",
      "2. Capital Gains (Finance Act 2024): 12.5% LTCG (>24 mo, no indexation), Slab Rate STCG (<=24 mo).",
      "3. Dividend Withholding: 25% US IRS tax withheld; file Form 67 before ITR to claim Foreign Tax Credit (FTC).",
      "4. Black Money Act Section 43 Protection: Disclose peak and closing portfolio balances in INR.",
      "5. US Estate Tax ($60k Cliff): Portfolios > $60,000 face up to 40% US estate tax; consider Ireland UCITS ETFs for scaling > ₹50L."
    ].join("\n");

    copyToClipboard(text, () => {
      setCopiedDossier(true);
      soundEngine.playSuccessTone();
      setTimeout(() => setCopiedDossier(false), 2500);
    });
  };

  // Schedule FA Mock Table Copy
  const handleCopyScheduleFa = () => {
    const stockName = simStock ? `${simStock.name} (${simStock.symbol})` : "US Mega-Cap Equity";
    const cagr = simStock?.cagr3Y || 15;
    const peakInr = Math.round(grossInr * (1 + (cagr / 100) * 0.5));
    const closingInr = Math.round(grossInr * (1 + (cagr / 100) * 0.3));
    const divYield = parseFloat((simStock?.divYield || "0.0%").replace(/[^0-9.]/g, "")) / 100;
    const grossDivInr = Math.round(grossInr * (divYield > 0 ? divYield : 0.005));
    const taxWithheldInr = Math.round(grossDivInr * 0.25);

    const text = [
      "SCHEDULE FA (TABLE A3) - DETAILS OF FOREIGN EQUITY & DEBT INTEREST",
      "------------------------------------------------------------------",
      "Country Code: 2 - United States of America",
      "Accounting Period: Calendar Year Basis (Jan 1 - Dec 31)",
      `Name of Foreign Entity / Equity: ${stockName} held via ${selectedBroker.partner}`,
      `Depository Broker: ${selectedBroker.name} (Clearing: ${selectedBroker.beneficiaryName})`,
      `Depository Bank Address: c/o ${selectedBroker.beneficiaryBank}, New York, NY 10013`,
      "ZIP Code: 10013",
      `Initial Investment Cost: ₹${grossInr.toLocaleString("en-IN")} ($${(grossInr / USD_INR_RATE).toFixed(2)})`,
      `Peak Balance during FY: ₹${peakInr.toLocaleString("en-IN")}`,
      `Closing Balance at Year End: ₹${closingInr.toLocaleString("en-IN")}`,
      `Gross Dividend Received: ₹${grossDivInr.toLocaleString("en-IN")}`,
      `Tax Paid Outside India (IRS 25% via DTAA): ₹${taxWithheldInr.toLocaleString("en-IN")}`,
      "------------------------------------------------------------------"
    ].join("\n");

    copyToClipboard(text, () => {
      setCopiedScheduleFa(true);
      soundEngine.playSuccessTone();
      setTimeout(() => setCopiedScheduleFa(false), 2500);
    });
  };

  return (
    <div className="p-6 sm:p-7 rounded-3xl bg-[#0d0f14]/95 border border-white/[0.08] backdrop-blur-3xl shadow-[0_25px_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-6">
      
      {/* ── 1. Master Section Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/35 flex items-center justify-center text-emerald-300 shadow-lg">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span>Cross-Border Execution &amp; Statutory Compliance</span>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                RBI LRS Terminal
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Form A2 NetBanking wire assistant, real-time Section 206C(1G) TCS optimization, and Schedule FA statutory filing shield.
            </p>
          </div>
        </div>

        {/* Global Copy Dossier Button */}
        <button
          type="button"
          onClick={handleCopyDossier}
          className={clsx(
            "px-3.5 py-2 rounded-xl text-xs font-mono font-bold border transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto active:scale-95 shadow-md",
            copiedDossier
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
              : "bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-slate-300 hover:text-white"
          )}
          title="Export compliance summary for your Chartered Accountant (CA)"
        >
          {copiedDossier ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
          <span>{copiedDossier ? "Dossier Copied" : "Copy Compliance Dossier"}</span>
        </button>
      </div>

      {/* ── 2. Primary 3-Lens Command Switcher ── */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
        {LENSES.map((lens) => {
          const Icon = lens.icon;
          const isActive = activeLens === lens.id;
          return (
            <button
              key={lens.id}
              type="button"
              onClick={() => {
                setActiveLens(lens.id);
                soundEngine.playTabSwitchTone();
              }}
              className={clsx(
                "flex-1 min-w-[150px] py-2.5 px-4 rounded-xl text-xs font-mono font-bold transition flex items-center justify-center gap-2 cursor-pointer",
                isActive
                  ? "bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 border border-cyan-500/40 text-cyan-200 shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.03]"
              )}
            >
              <Icon className={clsx("w-4 h-4", isActive ? "text-cyan-300" : "text-slate-500")} />
              <span>{lens.label}</span>
            </button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          LENS 1: ONBOARDING & NETBANKING WIRE ASSISTANT
      ════════════════════════════════════════════════════════════════════════ */}
      {activeLens === "onboarding_wire" && (
        <div className="space-y-5 animate-in fade-in duration-200">
          
          {/* Progress Milestone Bar */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Onboarding Readiness:</span>
              </span>
              <span className="text-emerald-300 font-bold">
                {completedSteps.length} of 3 Milestones Completed ({Math.round((completedSteps.length / 3) * 100)}%)
              </span>
            </div>

            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-emerald-400 transition-all duration-500"
                style={{ width: `${(completedSteps.length / 3) * 100}%` }}
              />
            </div>
          </div>

          {/* 3 Step Interactive Execution Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            
            {/* Step 1 */}
            <div className={clsx(
              "p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3",
              completedSteps.includes(1)
                ? "bg-cyan-500/[0.04] border-cyan-500/30"
                : "bg-white/[0.02] border-white/5"
            )}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-xl bg-cyan-500/20 text-cyan-300 font-black font-mono flex items-center justify-center text-xs">
                      1
                    </span>
                    <strong className="text-white font-bold flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                      Open US Brokerage
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleStep(1)}
                    className={clsx(
                      "p-1 rounded-lg border transition cursor-pointer",
                      completedSteps.includes(1)
                        ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                        : "bg-white/[0.03] border-white/10 text-slate-500 hover:text-white"
                    )}
                    title="Mark Step 1 complete"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Digital KYC completed in 5 minutes via Aadhaar &amp; PAN. Automated W-8BEN treaty registration avoids manual IRS paperwork.
                </p>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center gap-1.5 text-[10px] font-mono">
                {BROKER_PROFILES.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setSelectedBrokerId(b.id);
                      soundEngine.playTabSwitchTone();
                    }}
                    className={clsx(
                      "flex-1 py-1 px-1.5 rounded-lg border text-center transition cursor-pointer",
                      selectedBrokerId === b.id
                        ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-200 font-bold"
                        : "bg-white/[0.02] border-white/5 text-slate-400 hover:text-white"
                    )}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2 */}
            <div className={clsx(
              "p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3",
              completedSteps.includes(2)
                ? "bg-indigo-500/[0.04] border-indigo-500/30"
                : "bg-white/[0.02] border-white/5"
            )}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-xl bg-indigo-500/20 text-indigo-300 font-black font-mono flex items-center justify-center text-xs">
                      2
                    </span>
                    <strong className="text-white font-bold flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-indigo-400" />
                      NetBanking Wire (LRS)
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleStep(2)}
                    className={clsx(
                      "p-1 rounded-lg border transition cursor-pointer",
                      completedSteps.includes(2)
                        ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                        : "bg-white/[0.03] border-white/10 text-slate-500 hover:text-white"
                    )}
                    title="Mark Step 2 complete"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Remit INR via your Indian bank NetBanking (HDFC, ICICI, SBI) under RBI LRS Purpose Code <strong>S0001 (Portfolio Investment Abroad)</strong>.
                </p>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>0% TCS Limit:</span>
                <span className="text-emerald-300 font-bold">₹7,00,000 / FY</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className={clsx(
              "p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3",
              completedSteps.includes(3)
                ? "bg-emerald-500/[0.04] border-emerald-500/30"
                : "bg-white/[0.02] border-white/5"
            )}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-xl bg-emerald-500/20 text-emerald-300 font-black font-mono flex items-center justify-center text-xs">
                      3
                    </span>
                    <strong className="text-white font-bold flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      Fractional Execution
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleStep(3)}
                    className={clsx(
                      "p-1 rounded-lg border transition cursor-pointer",
                      completedSteps.includes(3)
                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                        : "bg-white/[0.03] border-white/10 text-slate-500 hover:text-white"
                    )}
                    title="Mark Step 3 complete"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Execute orders from $1 (~₹88). Equities are held in your legal name and protected up to <strong>$500,000 under US SIPC</strong>.
                </p>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono font-bold">
                <span className="text-emerald-300">SIPC Protection</span>
                <span className="text-slate-400">Free Repatriation</span>
              </div>
            </div>

          </div>

          {/* 1-Click FEMA Form A2 NetBanking Wire Assistant Drawer */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-white/[0.03] to-black/50 border border-white/10 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-cyan-400" />
                <div>
                  <strong className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider block">
                    FEMA Form A2 NetBanking Wire Assistant ({selectedBroker.name})
                  </strong>
                  <span className="text-[10px] text-slate-400">
                    Use these verified fields inside HDFC, ICICI, SBI, or Axis Bank Outward Remittance portals.
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 self-start sm:self-auto font-bold">
                Standard Wire Template
              </span>
            </div>

            {/* Quick-Copy Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs font-mono">
              
              {/* Field 1: Purpose Code */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-2">
                <div className="space-y-0.5 overflow-hidden">
                  <span className="text-[9px] text-slate-400 uppercase block">LRS Purpose Code</span>
                  <strong className="text-xs text-white block truncate">{selectedBroker.purposeCode}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyWireField("purpose", "S0001")}
                  className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition cursor-pointer flex-shrink-0"
                  title="Copy purpose code"
                >
                  {copiedField === "purpose" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Field 2: Beneficiary Name */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-2">
                <div className="space-y-0.5 overflow-hidden">
                  <span className="text-[9px] text-slate-400 uppercase block">Beneficiary Name</span>
                  <strong className="text-xs text-white block truncate">{selectedBroker.beneficiaryName}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyWireField("beneficiary", selectedBroker.beneficiaryName)}
                  className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition cursor-pointer flex-shrink-0"
                  title="Copy beneficiary name"
                >
                  {copiedField === "beneficiary" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Field 3: Beneficiary Bank */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-2">
                <div className="space-y-0.5 overflow-hidden">
                  <span className="text-[9px] text-slate-400 uppercase block">Beneficiary Bank</span>
                  <strong className="text-xs text-white block truncate">{selectedBroker.beneficiaryBank}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyWireField("bank", selectedBroker.beneficiaryBank)}
                  className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition cursor-pointer flex-shrink-0"
                  title="Copy bank name"
                >
                  {copiedField === "bank" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Field 4: SWIFT / BIC */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-2">
                <div className="space-y-0.5 overflow-hidden">
                  <span className="text-[9px] text-slate-400 uppercase block">SWIFT / BIC Code</span>
                  <strong className="text-xs text-cyan-300 font-black block truncate">{selectedBroker.swiftBic}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyWireField("swift", selectedBroker.swiftBic)}
                  className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition cursor-pointer flex-shrink-0"
                  title="Copy SWIFT code"
                >
                  {copiedField === "swift" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Field 5: Routing (ABA) */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-2">
                <div className="space-y-0.5 overflow-hidden">
                  <span className="text-[9px] text-slate-400 uppercase block">Routing Number (ABA)</span>
                  <strong className="text-xs text-white block truncate">{selectedBroker.routingAba}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyWireField("routing", selectedBroker.routingAba)}
                  className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition cursor-pointer flex-shrink-0"
                  title="Copy routing number"
                >
                  {copiedField === "routing" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Field 6: Client Sub-Account ID */}
              <div className="p-3 rounded-xl bg-black/40 border border-cyan-500/20 flex items-center justify-between gap-2">
                <div className="space-y-0.5 overflow-hidden">
                  <span className="text-[9px] text-cyan-300 uppercase block font-bold">Beneficiary A/C or Reference</span>
                  <strong className="text-xs text-amber-300 block truncate">{selectedBroker.accountPlaceholder}</strong>
                </div>
                <span className="text-[9px] font-sans text-slate-400 font-bold px-1.5 py-0.5 rounded bg-white/[0.05]">
                  Your Broker ID
                </span>
              </div>

            </div>

            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-start gap-2 text-xs text-cyan-200">
              <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>NetBanking Tip:</strong> In your Indian bank NetBanking portal, select <strong>"Foreign Outward Remittance (LRS)"</strong>, choose purpose code <strong>S0001</strong>, and paste the beneficiary details above. Your broker will automatically credit your USD wallet within 12–24 business hours.
              </span>
            </div>
          </div>

        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          LENS 2: LIVE LRS REMITTANCE & TCS OPTIMIZER
      ════════════════════════════════════════════════════════════════════════ */}
      {activeLens === "remittance_tcs" && (
        <div className="p-5 rounded-2xl bg-gradient-to-b from-white/[0.03] to-black/40 border border-white/10 space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-cyan-400" />
              <strong className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                Live LRS Remittance &amp; Section 206C(1G) TCS Simulator
              </strong>
            </div>
            <span className={clsx(
              "text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border self-start sm:self-auto",
              isTcsZero
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                : "bg-amber-500/15 border-amber-500/30 text-amber-300"
            )}>
              {isTcsZero ? "0% TCS Active (Under ₹7L)" : "20% TCS Applicable on Excess"}
            </span>
          </div>

          {/* Simulator Allocation Synchronization Banner */}
          {simStock && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-xs font-mono text-cyan-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>
                  Target Asset: <strong>{simStock.name} ({simStock.symbol})</strong> · Simulator Capital: <strong>₹{simRupees.toLocaleString("en-IN")}</strong>
                </span>
              </div>
              {grossInr !== simRupees && (
                <button
                  type="button"
                  onClick={() => {
                    setRemitAmount(simRupees);
                    soundEngine.playSuccessTone();
                  }}
                  className="text-[10px] text-cyan-300 hover:text-white underline font-bold cursor-pointer self-start sm:self-auto"
                >
                  ⚡ Reset to Simulator Capital (₹{simRupees.toLocaleString("en-IN")})
                </button>
              )}
            </div>
          )}

          {/* Input Controls Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Column 1: Remittance Amount Slider & Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Transfer Capital (INR):</span>
                <span className="text-white font-bold text-sm">₹{grossInr.toLocaleString("en-IN")}</span>
              </div>

              <input
                type="range"
                min={10000}
                max={1500000}
                step={5000}
                value={grossInr}
                onChange={(e) => setRemitAmount(Number(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1 pt-1">
                {REMITTANCE_PRESETS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setRemitAmount(amt);
                      soundEngine.playSuccessTone();
                    }}
                    className={clsx(
                      "px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border transition cursor-pointer",
                      grossInr === amt
                        ? "bg-cyan-500/25 border-cyan-500/50 text-cyan-200"
                        : "bg-white/[0.03] border-white/5 text-slate-400 hover:text-white"
                    )}
                  >
                    ₹{(amt / 1000).toFixed(0)}k
                  </button>
                ))}
              </div>
            </div>

            {/* Column 2: Prior Remittances this FY */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Prior FY Remittances:</span>
                <span className="text-white font-bold">₹{priorInr.toLocaleString("en-IN")}</span>
              </div>

              <input
                type="range"
                min={0}
                max={1500000}
                step={25000}
                value={priorInr}
                onChange={(e) => setPriorRemittances(Number(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-400"
              />

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1">
                <span>Remaining ₹7L Exemption:</span>
                <span className="text-emerald-300 font-bold">₹{remainingExemption.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Column 3: Banking Channel Selector */}
            <div className="space-y-1.5">
              <span className="text-xs font-mono text-slate-400 block">Banking Route:</span>
              <div className="space-y-1">
                {BANKING_CHANNELS.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      setChannelId(ch.id);
                      soundEngine.playTabSwitchTone();
                    }}
                    className={clsx(
                      "w-full text-left p-2 rounded-xl border transition cursor-pointer flex items-center justify-between text-xs",
                      channelId === ch.id
                        ? "bg-cyan-500/15 border-cyan-500/40 text-white"
                        : "bg-white/[0.02] border-white/5 text-slate-400 hover:text-slate-200"
                    )}
                  >
                    <div>
                      <strong className="block text-[11px] font-mono">{ch.label}</strong>
                      <span className="text-[9px] text-slate-400">{ch.desc}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-cyan-300">
                      {ch.fixedFee === 0 ? "₹0 Wire" : "₹885 Wire"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Real-Time Mathematical Telemetry Results */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-3 border-t border-white/10">
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Bank &amp; Wire Drag</span>
              <strong className="text-sm font-mono font-black text-rose-300">
                ₹{totalOverhead.toLocaleString("en-IN")}
              </strong>
              <span className="text-[10px] font-mono text-slate-400 block">
                {overheadPct}% friction
              </span>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Net Investable USD</span>
              <strong className="text-sm font-mono font-black text-emerald-300">
                ${effectiveUsd.toFixed(2)}
              </strong>
              <span className="text-[10px] font-mono text-slate-400 block">
                @ ₹{USD_INR_RATE.toFixed(2)}/USD
              </span>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">TCS Liability (20%)</span>
              <strong className={clsx(
                "text-sm font-mono font-black",
                isTcsZero ? "text-slate-400" : "text-amber-300"
              )}>
                ₹{tcsPayable.toLocaleString("en-IN")}
              </strong>
              <span className="text-[10px] font-mono text-slate-400 block">
                {isTcsZero ? "100% Exempt" : "100% ITR Credit"}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Effective Out-of-Pocket</span>
              <strong className="text-sm font-mono font-black text-white">
                ₹{(grossInr + tcsPayable).toLocaleString("en-IN")}
              </strong>
              <span className="text-[10px] font-mono text-cyan-300 block">
                Capital + TCS
              </span>
            </div>
          </div>

          {/* Micro-Deposit Overhead Warning */}
          {isHighFriction && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Micro-Remittance Advisory:</strong> At ₹{grossInr.toLocaleString("en-IN")}, banking transaction drag is <strong>{overheadPct}%</strong>.
                Consider pooling funds to <strong>₹50,000+</strong> or utilizing partner bank zero-wire channels to keep transaction friction strictly below <strong>1.5%</strong>.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          LENS 3: STATUTORY TAX SHIELD & SCHEDULE FA GENERATOR
      ════════════════════════════════════════════════════════════════════════ */}
      {activeLens === "tax_shield" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Sub-Tabs Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.02] border border-white/10">
              {[
                { id: "schedule_fa", label: "Schedule FA Guide" },
                { id: "mock_return", label: "Mock FA Table A3" },
                { id: "tax_showdown", label: "Domestic vs US Tax Showdown" },
                { id: "dtaa_form67", label: "DTAA & Form 67" },
                { id: "estate_tax", label: "Estate Tax ($60k Cliff)" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTaxTab(tab.id);
                    soundEngine.playTabSwitchTone();
                  }}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer",
                    activeTaxTab === tab.id
                      ? "bg-indigo-500/25 text-indigo-200 border border-indigo-500/40 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTaxTab === "mock_return" && (
              <button
                type="button"
                onClick={handleCopyScheduleFa}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 font-mono text-xs font-bold transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm"
              >
                {copiedScheduleFa ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedScheduleFa ? "Table Copied" : "Copy Schedule FA for CA"}</span>
              </button>
            )}
          </div>

          {/* Sub-Tab 1: Schedule FA Guide */}
          {activeTaxTab === "schedule_fa" && (
            <div className="p-4 rounded-2xl bg-amber-500/[0.06] border border-amber-500/25 space-y-3">
              <div className="flex items-center justify-between">
                <strong className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mandatory Foreign Asset Disclosure: Schedule FA in ITR-2</span>
                </strong>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/35 font-bold">
                  Black Money Act Protection
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">1. ITR Form Mandate</span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Holding any foreign equity disqualifies you from filing simple <strong>ITR-1 (Sahaj)</strong>. You <strong>must file ITR-2 or ITR-3</strong> regardless of whether you sold any shares or earned dividends.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">2. Schedule FA Table A3</span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Disclose equity holdings in <strong>Table A3</strong> (Foreign Equity &amp; Debt). Report: Country Code (USA = 2), Broker Name, Peak Portfolio Value in INR, and Closing Balance at Year-End.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">3. Non-Disclosure Penalty</span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Under <strong>Section 43 of the Black Money Act (2015)</strong>, wilful failure to disclose foreign assets attracts a <strong>₹10,00,000 penalty</strong>. Always report your peak holdings.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 2: Mock Schedule FA Table Generator */}
          {activeTaxTab === "mock_return" && (
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <strong className="text-xs font-bold text-white block">
                    ITR-2 Schedule FA (Table A3) Mock Return Generator
                  </strong>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Based on current simulated investment capital: ₹{grossInr.toLocaleString("en-IN")}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-cyan-300 font-bold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                  Ready for e-Filing
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] font-mono uppercase text-slate-400">
                      <th className="py-2 px-2">Field Description</th>
                      <th className="py-2 px-2">Statutory Code</th>
                      <th className="py-2 px-2 text-right">Computed Value (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                    <tr>
                      <td className="py-2 px-2 text-slate-300">Country Name &amp; Code</td>
                      <td className="py-2 px-2 text-cyan-300">USA (Code 2)</td>
                      <td className="py-2 px-2 text-right text-white font-bold">Code 2</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2 text-slate-300">Foreign Accounting Period</td>
                      <td className="py-2 px-2 text-slate-400">Calendar Year Basis</td>
                      <td className="py-2 px-2 text-right text-emerald-300 font-bold">Jan 1 – Dec 31 (US SEC)</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2 text-slate-300">Name of Foreign Entity / Equity</td>
                      <td className="py-2 px-2 text-slate-400">
                        {simStock ? `${simStock.symbol} · ${selectedBroker.partner}` : selectedBroker.partner}
                      </td>
                      <td className="py-2 px-2 text-right text-white truncate max-w-[150px]">
                        {simStock ? `${simStock.name} (${simStock.symbol})` : `${selectedBroker.name} Custody`}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2 text-slate-300">Initial Investment (Cost of Acquisition)</td>
                      <td className="py-2 px-2 text-slate-400">Total Purchase Basis</td>
                      <td className="py-2 px-2 text-right text-white font-bold">
                        ₹{grossInr.toLocaleString("en-IN")} <span className="text-[9px] text-slate-400">(${effectiveUsd.toFixed(0)})</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2 text-slate-300">Peak Portfolio Balance during FY</td>
                      <td className="py-2 px-2 text-slate-400">Highest Converted Balance</td>
                      <td className="py-2 px-2 text-right text-emerald-300 font-bold">
                        ₹{Math.round(grossInr * (1 + (simStock?.cagr3Y || 15) / 100 * 0.5)).toLocaleString("en-IN")}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2 text-slate-300">Closing Balance at Financial Year End</td>
                      <td className="py-2 px-2 text-slate-400">March 31 Valuation</td>
                      <td className="py-2 px-2 text-right text-indigo-300 font-bold">
                        ₹{Math.round(grossInr * (1 + (simStock?.cagr3Y || 15) / 100 * 0.3)).toLocaleString("en-IN")}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2 text-slate-300">Gross Dividend Income Received</td>
                      <td className="py-2 px-2 text-slate-400">Reported under Other Sources</td>
                      <td className="py-2 px-2 text-right text-amber-300">
                        ₹{Math.round(grossInr * (parseFloat((simStock?.divYield || "0.0%").replace(/[^0-9.]/g, "")) > 0 ? parseFloat(simStock.divYield) / 100 : 0.005)).toLocaleString("en-IN")}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2 text-slate-300">Taxes Withheld Outside India (Form 67)</td>
                      <td className="py-2 px-2 text-slate-400">Article 10 DTAA 25% IRS</td>
                      <td className="py-2 px-2 text-right text-emerald-300">
                        ₹{Math.round(grossInr * (parseFloat((simStock?.divYield || "0.0%").replace(/[^0-9.]/g, "")) > 0 ? parseFloat(simStock.divYield) / 100 : 0.005) * 0.25).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-mono text-cyan-200 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>CBDT Filing Tip:</strong> Under CBDT instructions for ITR-2, foreign assets are reported on the foreign jurisdiction accounting period (US Calendar Year: Jan 1 – Dec 31). Use your broker&apos;s annual 1042-S statement for exact automated reconciliation with the tax portal.
                </span>
              </div>
            </div>
          )}

          {/* Sub-Tab 3: Domestic NSE vs US Equities Tax Showdown */}
          {activeTaxTab === "tax_showdown" && (
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <strong className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Tax Arbitrage Showdown: Domestic NSE vs US Equities (Finance Act 2024)</span>
                </strong>
                <span className="text-[10px] font-mono text-indigo-300 px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 font-bold">
                  Post-Budget 2024
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] font-mono uppercase text-slate-400">
                      <th className="py-2 px-2">Tax Dimension</th>
                      <th className="py-2 px-2 text-cyan-300">Domestic Indian Equities (NSE/BSE)</th>
                      <th className="py-2 px-2 text-emerald-300">US Equities (NASDAQ/NYSE via LRS)</th>
                      <th className="py-2 px-2 text-slate-400">Strategic Alpha Verdict</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                    {TAX_COMPARISON_DATA.map((row) => (
                      <tr key={row.metric} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-2 font-bold text-white">{row.metric}</td>
                        <td className="py-2.5 px-2 text-cyan-200">{row.domestic}</td>
                        <td className="py-2.5 px-2 text-emerald-200 font-bold">{row.us}</td>
                        <td className="py-2.5 px-2 text-slate-400 font-sans text-[10px]">{row.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-Tab 4: DTAA & Form 67 */}
          {activeTaxTab === "dtaa_form67" && (
            <div className="p-4 rounded-2xl bg-indigo-500/[0.06] border border-indigo-500/25 space-y-3">
              <div className="flex items-center justify-between">
                <strong className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>US-India DTAA Article 10 &amp; Form 67 Foreign Tax Credit</span>
                </strong>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/35 font-bold">
                  100% Double Taxation Relief
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
                  <span className="text-indigo-300 font-bold font-mono block">25% US IRS Dividend Withholding</span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Under Article 10 of the Indo-US Double Tax Avoidance Agreement (DTAA), US brokers withhold <strong>25% tax</strong> on cash dividends paid to Indian residents possessing a valid Form W-8BEN.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
                  <span className="text-emerald-300 font-bold font-mono block">Claiming Credit via Form 67</span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    You can claim a 100% <strong>Foreign Tax Credit (FTC)</strong> in India for the 25% tax paid to the IRS by filing <strong>Form 67</strong> on the income tax portal prior to submitting your ITR-2 return.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 5: US Estate Tax Cliff */}
          {activeTaxTab === "estate_tax" && (
            <div className="p-4 rounded-2xl bg-rose-500/[0.06] border border-rose-500/25 space-y-3">
              <div className="flex items-center justify-between">
                <strong className="text-xs font-bold text-rose-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
                  <span>US Estate Tax Warning for Indian Investors (IRS Section 2101)</span>
                </strong>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/35 font-bold">
                  $60,000 (~₹50L) Threshold
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
                  <span className="text-rose-300 font-bold font-mono block">The Non-Resident Alien (NRA) Cliff</span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Unlike Indian law (which has 0% inheritance tax), the US IRS levies up to <strong>40% Estate Tax</strong> on US-sited equities owned by non-resident aliens if total portfolio value exceeds <strong>$60,000 (~₹50 Lakhs)</strong> upon demise.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
                  <span className="text-emerald-300 font-bold font-mono block">The HNW UCITS Solution</span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    For portfolios compounding beyond ₹50 Lakhs, sophisticated Indian investors route through <strong>Ireland-domiciled UCITS ETFs</strong> (e.g. CSPX, VUAA via IBKR). Ireland has 0% estate tax for non-residents and 15% dividend treaty with the US.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}

export default ForeignStocksRoadmap;
