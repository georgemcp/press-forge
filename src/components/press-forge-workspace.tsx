"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useReducer, useRef } from "react";
import {
  Box,
  Download,
  ImagePlus,
  Layers3,
  Loader2,
  Mail,
  MessageSquare,
  Play,
  Ruler,
  Send,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  WalletCards,
  Wand2,
  X,
  Palette,
  Lightbulb,
  Save,
  FolderOpen,
  Clock,
  CheckCircle2,
  FileText,
} from "lucide-react";
import {
  PRINT_PROFILES,
  PRINT_WORKFLOW_PRESETS,
  PRODUCT_PROFILES,
  getPrintWorkflowPresetSummary,
  type PrintProfileId,
  type PrintWorkflowPresetId,
  type ProductType
} from "@/lib/print/constants";
import { deriveLayoutSpecFromBrief } from "@/lib/print/brief-layout";
import type { LayoutSpec } from "@/lib/print/layout-spec";
import { sampleBriefs, type SampleBrief } from "@/lib/print/sample-briefs";
import type { PreflightReport } from "@/lib/print/preflight";
import type { BriefEnhancementResult } from "@/lib/ai/brief-enhancer";
import { trackEvent } from "@/lib/analytics/events";
import { getAnalyticsAttribution } from "@/lib/analytics/attribution";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PressForgeWorkspaceProps {
  accountEmail: string;
  checkoutSessionId?: string;
  checkoutState?: string;
  initialSpec: LayoutSpec;
  initialMode?: WorkspaceMode;
}

interface ProofApiResponse {
  mode: WorkspaceMode;
  report: PreflightReport;
  productionDownloadLocked?: boolean;
  demoArtWatermarked?: boolean;
  downloadUrl?: string;
  sourceUrl?: string;
  svgUrl?: string;
  reportUrl?: string;
  reportHtmlUrl?: string;
  reportTextUrl?: string;
  assetUrls?: Array<{
    slotId: string;
    provider: "openai" | "gemini" | "recraft" | "deterministic";
    url: string;
    previewUrl?: string;
    effectiveDpi: number;
  }>;
  analytics?: {
    status: "sent" | "skipped" | "failed";
    configured: boolean;
    provider: "ga4_measurement_protocol";
    reason?: string;
  };
}

type ProofAssetUrl = NonNullable<ProofApiResponse["assetUrls"]>[number];

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  size: number;
  contentType: string;
  category?: UploadCategory;
  createdAt?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface DesignVariation {
  id: string;
  layoutSpec: LayoutSpec;
  designRationale: string;
  iteration: number;
  proof?: ProofApiResponse;
}

type CheckoutMode = "payment" | "subscription";
type WorkspaceMode = "dummy" | "advanced";
type PdfxLevel = LayoutSpec["pdfxLevel"];
type LeftPanelTab = "brief" | "uploads" | "specs";
type UploadCategory = "reference" | "source";
type UploadIntent = UploadCategory;

interface PaidSession {
  id: string;
  entitlement: "export_credit" | "subscription";
}

interface WorkspaceState {
  mode: WorkspaceMode;
  brief: string;
  enhancedBrief: BriefEnhancementResult | null;
  productType: ProductType;
  printProfile: PrintProfileId;
  pdfxLevel: PdfxLevel;
  cropMarks: boolean;
  spec: LayoutSpec;
  proof: ProofApiResponse | undefined;
  error: string | undefined;
  checkoutPending: CheckoutMode | undefined;
  accessPending: boolean;
  portalPending: boolean;
  accessMessage: string | undefined;
  paidSession: PaidSession | undefined;
  sessionPending: boolean;
  isPending: boolean;
  isEnhancing: boolean;
  isGenerating: boolean;
  uploadedFiles: UploadedFile[];
  isUploading: boolean;
  uploadMessage: string | null;
  designVariations: DesignVariation[];
  chatMessages: ChatMessage[];
  activeVariationId: string | null;
  designRationale: string | null;
  leftPanelTab: LeftPanelTab;
  enhanceError: string | null;
  chatError: string | null;
  isChatPending: boolean;
  savedDesigns: SavedDesignSummary[];
  currentDesignId: string | null;
  clientName: string;
  jobName: string;
  isSaving: boolean;
  isLoadingDesigns: boolean;
  saveMessage: string | null;
}

interface SavedDesignSummary {
  id: string;
  name: string;
  clientName?: string;
  jobName?: string;
  productType: string;
  updatedAt: string;
}

type WorkspaceAction =
  | { type: "SET_MODE"; mode: WorkspaceMode }
  | { type: "SET_BRIEF"; brief: string }
  | { type: "SET_ENHANCED_BRIEF"; enhancedBrief: BriefEnhancementResult | null }
  | { type: "SET_PRODUCT_TYPE"; productType: ProductType }
  | { type: "SET_PRINT_PROFILE"; printProfile: PrintProfileId }
  | { type: "SET_PDFX_LEVEL"; pdfxLevel: PdfxLevel }
  | { type: "SET_CROP_MARKS"; cropMarks: boolean }
  | { type: "SET_SPEC"; spec: LayoutSpec }
  | { type: "SET_PROOF"; proof: ProofApiResponse | undefined }
  | { type: "SET_ERROR"; error: string | undefined }
  | { type: "SET_CHECKOUT_PENDING"; checkoutPending: CheckoutMode | undefined }
  | { type: "SET_ACCESS_PENDING"; accessPending: boolean }
  | { type: "SET_PORTAL_PENDING"; portalPending: boolean }
  | { type: "SET_ACCESS_MESSAGE"; accessMessage: string | undefined }
  | { type: "SET_PAID_SESSION"; paidSession: PaidSession | undefined }
  | { type: "SET_SESSION_PENDING"; sessionPending: boolean }
  | { type: "SET_IS_PENDING"; isPending: boolean }
  | { type: "SET_IS_ENHANCING"; isEnhancing: boolean }
  | { type: "SET_IS_GENERATING"; isGenerating: boolean }
  | { type: "ADD_UPLOADED_FILE"; file: UploadedFile }
  | { type: "REMOVE_UPLOADED_FILE"; fileId: string }
  | { type: "SET_UPLOADED_FILES"; files: UploadedFile[] }
  | { type: "SET_IS_UPLOADING"; isUploading: boolean }
  | { type: "SET_UPLOAD_MESSAGE"; message: string | null }
  | { type: "ADD_DESIGN_VARIATION"; variation: DesignVariation }
  | { type: "SET_DESIGN_VARIATIONS"; variations: DesignVariation[] }
  | { type: "ADD_CHAT_MESSAGE"; message: ChatMessage }
  | { type: "SET_CHAT_MESSAGES"; messages: ChatMessage[] }
  | { type: "SET_ACTIVE_VARIATION"; variationId: string | null }
  | { type: "SET_DESIGN_RATIONALE"; rationale: string | null }
  | { type: "SET_LEFT_PANEL_TAB"; tab: LeftPanelTab }
  | { type: "SET_ENHANCE_ERROR"; error: string | null }
  | { type: "SET_CHAT_ERROR"; error: string | null }
  | { type: "SET_IS_CHAT_PENDING"; isChatPending: boolean }
  | { type: "UPDATE_VARIATION_PROOF"; variationId: string; proof: ProofApiResponse }
  | { type: "SET_SAVED_DESIGNS"; designs: SavedDesignSummary[] }
  | { type: "SET_CURRENT_DESIGN_ID"; id: string | null }
  | { type: "SET_CLIENT_NAME"; clientName: string }
  | { type: "SET_JOB_NAME"; jobName: string }
  | { type: "SET_IS_SAVING"; isSaving: boolean }
  | { type: "SET_IS_LOADING_DESIGNS"; isLoading: boolean }
  | { type: "SET_SAVE_MESSAGE"; message: string | null };

function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case "SET_MODE": return { ...state, mode: action.mode };
    case "SET_BRIEF": return { ...state, brief: action.brief };
    case "SET_ENHANCED_BRIEF": return { ...state, enhancedBrief: action.enhancedBrief };
    case "SET_PRODUCT_TYPE": return { ...state, productType: action.productType };
    case "SET_PRINT_PROFILE": return { ...state, printProfile: action.printProfile, spec: { ...state.spec, printProfile: action.printProfile } };
    case "SET_PDFX_LEVEL": return { ...state, pdfxLevel: action.pdfxLevel, spec: { ...state.spec, pdfxLevel: action.pdfxLevel } };
    case "SET_CROP_MARKS": return { ...state, cropMarks: action.cropMarks, spec: { ...state.spec, cropMarks: action.cropMarks } };
    case "SET_SPEC": return { ...state, spec: action.spec };
    case "SET_PROOF": return { ...state, proof: action.proof };
    case "SET_ERROR": return { ...state, error: action.error };
    case "SET_CHECKOUT_PENDING": return { ...state, checkoutPending: action.checkoutPending };
    case "SET_ACCESS_PENDING": return { ...state, accessPending: action.accessPending };
    case "SET_PORTAL_PENDING": return { ...state, portalPending: action.portalPending };
    case "SET_ACCESS_MESSAGE": return { ...state, accessMessage: action.accessMessage };
    case "SET_PAID_SESSION": return { ...state, paidSession: action.paidSession };
    case "SET_SESSION_PENDING": return { ...state, sessionPending: action.sessionPending };
    case "SET_IS_PENDING": return { ...state, isPending: action.isPending };
    case "SET_IS_ENHANCING": return { ...state, isEnhancing: action.isEnhancing };
    case "SET_IS_GENERATING": return { ...state, isGenerating: action.isGenerating };
    case "ADD_UPLOADED_FILE": return { ...state, uploadedFiles: [...state.uploadedFiles, action.file] };
    case "REMOVE_UPLOADED_FILE": return { ...state, uploadedFiles: state.uploadedFiles.filter(f => f.id !== action.fileId) };
    case "SET_UPLOADED_FILES": return { ...state, uploadedFiles: action.files };
    case "SET_IS_UPLOADING": return { ...state, isUploading: action.isUploading };
    case "SET_UPLOAD_MESSAGE": return { ...state, uploadMessage: action.message };
    case "ADD_DESIGN_VARIATION": return { ...state, designVariations: [...state.designVariations, action.variation] };
    case "SET_DESIGN_VARIATIONS": return { ...state, designVariations: action.variations };
    case "ADD_CHAT_MESSAGE": return { ...state, chatMessages: [...state.chatMessages, action.message] };
    case "SET_CHAT_MESSAGES": return { ...state, chatMessages: action.messages };
    case "SET_ACTIVE_VARIATION": return { ...state, activeVariationId: action.variationId };
    case "SET_DESIGN_RATIONALE": return { ...state, designRationale: action.rationale };
    case "SET_LEFT_PANEL_TAB": return { ...state, leftPanelTab: action.tab };
    case "SET_ENHANCE_ERROR": return { ...state, enhanceError: action.error };
    case "SET_CHAT_ERROR": return { ...state, chatError: action.error };
    case "SET_IS_CHAT_PENDING": return { ...state, isChatPending: action.isChatPending };
    case "UPDATE_VARIATION_PROOF":
      return {
        ...state,
        designVariations: state.designVariations.map(v =>
          v.id === action.variationId ? { ...v, proof: action.proof } : v
        ),
        proof: action.proof,
      };
    case "SET_SAVED_DESIGNS":
      return { ...state, savedDesigns: action.designs };
    case "SET_CURRENT_DESIGN_ID":
      return { ...state, currentDesignId: action.id };
    case "SET_CLIENT_NAME":
      return { ...state, clientName: action.clientName };
    case "SET_JOB_NAME":
      return { ...state, jobName: action.jobName };
    case "SET_IS_SAVING":
      return { ...state, isSaving: action.isSaving };
    case "SET_IS_LOADING_DESIGNS":
      return { ...state, isLoadingDesigns: action.isLoading };
    case "SET_SAVE_MESSAGE":
      return { ...state, saveMessage: action.message };
    default:
      return state;
  }
}

function GuideLabel({ children, tone }: { children: React.ReactNode; tone: "bleed" | "trim" | "safe" }) {
  const colors = {
    bleed: "border-accent text-accent",
    trim: "border-surface-ink text-surface-ink",
    safe: "border-success text-success",
  };
  return (
    <span className={`rounded-[4px] border px-2 py-1 text-[11px] font-semibold uppercase tracking-normal ${colors[tone]}`}>
      {children}
    </span>
  );
}

function toDisplayName(value: string | undefined) {
  if (!value) {
    return "";
  }
  return value
    .trim()
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function getSpecBrand(spec: LayoutSpec) {
  return toDisplayName(spec.textBlocks.find((block) => block.id === "brand")?.content);
}

function defaultJobName(productType: ProductType) {
  return `${PRODUCT_PROFILES[productType].label} proof`;
}

function buildSavedDesignMetadata(state: WorkspaceState, specOverride?: LayoutSpec) {
  const spec = specOverride ?? state.spec;
  const clientName = state.clientName.trim() || state.enhancedBrief?.brandName?.trim() || getSpecBrand(spec);
  const jobName = state.jobName.trim() || defaultJobName(state.productType);
  const name = clientName ? `${clientName} - ${jobName}` : jobName;

  return {
    name,
    clientName,
    jobName
  };
}

function getFileBaseName(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

function getUploadDisplayName(file: UploadedFile) {
  return toDisplayName(getFileBaseName(file.name)) || "Uploaded customer file";
}

function isPdfUpload(file: UploadedFile) {
  return file.contentType === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function canPreviewUploadedImage(file: UploadedFile) {
  return ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.contentType);
}

function getDesignReferenceImageUrls(files: UploadedFile[]) {
  return files.filter(canPreviewUploadedImage).map((file) => file.url);
}

function getReferenceDescriptions(files: UploadedFile[]) {
  return files.map((file) => `${file.name} (${isPdfUpload(file) ? "PDF source file" : "image reference"})`);
}

function formatFileSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) {
    return "Stored file";
  }
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function inferProductTypeFromFileName(name: string, fallback: ProductType): ProductType {
  const normalized = name.toLowerCase();
  const entries: Array<[ProductType, RegExp]> = [
    ["business_card", /\b(business[-_\s]?card|calling[-_\s]?card|card)\b/],
    ["postcard", /\b(postcard|mailer)\b/],
    ["flyer", /\b(flyer|flier|one[-_\s]?sheet|sell[-_\s]?sheet)\b/],
    ["poster", /\b(poster|sign)\b/],
    ["brochure", /\b(brochure|tri[-_\s]?fold|trifold)\b/],
    ["letterhead", /\b(letterhead|stationery)\b/],
    ["menu", /\b(menu|takeout|restaurant|cafe|bar)\b/],
  ];
  return entries.find(([, pattern]) => pattern.test(normalized))?.[0] ?? fallback;
}

function buildUploadedFileBrief(file: UploadedFile, productType: ProductType) {
  const fileLabel = getUploadDisplayName(file);
  const productLabel = PRODUCT_PROFILES[productType].label.toLowerCase();
  const sourceKind = isPdfUpload(file) ? "PDF" : "image";

  return [
    `Brand: ${fileLabel}.`,
    `Create a print-ready ${productLabel} proof based on the uploaded customer ${sourceKind} "${file.name}".`,
    "Rebuild it as a fresh Trim Proof layout; keep the useful offer, hierarchy, and visual cues, but do not assume the source file is production-ready.",
    "Check bleed, trim, safe area, crop marks, vector text, color workflow, and image resolution before export."
  ].join(" ");
}

function getActivePrintWorkflowPreset(state: WorkspaceState): PrintWorkflowPresetId | undefined {
  return (Object.keys(PRINT_WORKFLOW_PRESETS) as PrintWorkflowPresetId[]).find((presetId) => {
    const preset = PRINT_WORKFLOW_PRESETS[presetId];
    return (
      preset.printProfile === state.printProfile &&
      preset.pdfxLevel === state.pdfxLevel &&
      preset.cropMarks === state.cropMarks
    );
  });
}

function formatPreflightStatus(status: PreflightReport["status"]) {
  if (status === "passed") {
    return "Passed";
  }
  if (status === "needs_attention") {
    return "Needs attention";
  }
  return "Failed";
}

function getProofCheckCounts(report: PreflightReport) {
  return report.checks.reduce(
    (counts, check) => {
      if (check.status === "passed") {
        counts.passed += 1;
      } else if (check.status === "needs_attention") {
        counts.needsAttention += 1;
      } else {
        counts.failed += 1;
      }
      counts.total += 1;
      return counts;
    },
    { passed: 0, needsAttention: 0, failed: 0, total: 0 }
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function PrintPreview({
  spec,
  assetUrl,
  assetProvider,
  demoArtWatermarked,
}: {
  spec: LayoutSpec;
  assetUrl?: string;
  assetProvider?: ProofAssetUrl["provider"];
  demoArtWatermarked?: boolean;
}) {
  const productProfile = PRODUCT_PROFILES[spec.productType];
  const aspect = productProfile.trimWidthIn / productProfile.trimHeightIn;
  const brand = spec.textBlocks.find((b) => b.id === "brand")?.content ?? "TRIM PROOF";
  const tagline = spec.textBlocks.find((b) => b.id === "tagline")?.content ?? "AI-powered print design.";
  const name = spec.textBlocks.find((b) => b.id === "name")?.content ?? "";
  const contact = spec.textBlocks.find((b) => b.id === "contact")?.content ?? "";

  return (
    <section className="flex min-h-0 flex-1 flex-col border-y border-border bg-surface xl:border-x xl:border-y-0">
      <div className="flex min-h-12 shrink-0 flex-col gap-2 border-b border-border px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Ruler aria-hidden className="h-4 w-4 text-accent" />
          <div>
            <h2 className="font-display text-sm font-semibold text-surface-ink">{productProfile.label} proof</h2>
            <p className="text-xs text-muted">
              {productProfile.trimWidthIn} in x {productProfile.trimHeightIn} in trim, {productProfile.bleedIn} in bleed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {demoArtWatermarked ? (
            <span className="rounded-[4px] border border-brand/40 bg-brand-soft px-2 py-1 text-[11px] font-semibold uppercase text-brand">Demo</span>
          ) : null}
          {assetProvider ? (
            <span className="rounded-[4px] border border-brand/40 bg-brand-soft px-2 py-1 text-[11px] font-semibold uppercase text-brand">{assetProvider}</span>
          ) : null}
          <GuideLabel tone="bleed">Bleed</GuideLabel>
          <GuideLabel tone="trim">Trim</GuideLabel>
          <GuideLabel tone="safe">Safe</GuideLabel>
        </div>
      </div>

      <div className="print-grid flex min-h-0 flex-1 items-center justify-center p-3">
        <div
          className="relative max-h-full max-w-[860px] border border-accent/80 bg-background p-[4.8%] shadow-[0_18px_56px_oklch(0.18_0.02_252_/_0.15)]"
          style={{
            aspectRatio: `${productProfile.trimWidthIn} / ${productProfile.trimHeightIn}`,
            width: `min(96%, ${Math.round(700 * aspect)}px)`,
          }}
        >
          <div className="absolute inset-[4.8%] border border-dashed border-accent" />
          <div className="absolute inset-[9.6%] border border-surface-ink" />
          <div className="absolute inset-[15.2%] border border-dashed border-success" />
          <div className="relative h-full overflow-hidden border border-transparent bg-[oklch(0.98_0.008_84)] p-5 sm:p-8">
            {assetUrl ? (
              <Image
                alt=""
                className="absolute inset-0 object-cover opacity-100 saturate-[1.08] contrast-[1.04]"
                fill
                sizes="(min-width: 1280px) 52vw, 94vw"
                src={assetUrl}
                unoptimized
              />
            ) : null}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,oklch(0.98_0.008_84_/_0.9)_0%,oklch(0.98_0.008_84_/_0.66)_26%,oklch(0.98_0.008_84_/_0.12)_46%,transparent_58%)]" />
            <div className="absolute bottom-5 right-5 top-5 z-10 w-2 bg-accent sm:bottom-7 sm:right-8 sm:top-7 sm:w-3" />
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <div className="relative font-display text-2xl font-bold tracking-normal text-surface-ink sm:text-3xl">{brand}</div>
                <div className="relative mt-2 max-w-[360px] text-sm font-semibold text-muted">{tagline}</div>
              </div>
              <div>
                {name ? <div className="relative font-display text-lg font-bold text-surface-ink sm:text-xl">{name}</div> : null}
                {contact ? <div className="relative mt-1 text-xs font-medium text-muted sm:text-sm">{contact}</div> : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function PressForgeWorkspace({
  accountEmail,
  checkoutSessionId,
  checkoutState,
  initialMode = "dummy",
  initialSpec,
}: PressForgeWorkspaceProps) {
  const [state, dispatch] = useReducer(workspaceReducer, {
    mode: initialMode,
    brief: "Create a premium business card for a modern tech startup. Clean, minimalist design with bold typography.",
    enhancedBrief: null,
    productType: initialSpec.productType,
    printProfile: initialSpec.printProfile,
    pdfxLevel: initialSpec.pdfxLevel,
    cropMarks: initialSpec.cropMarks,
    spec: initialSpec,
    proof: undefined,
    error: undefined,
    checkoutPending: undefined,
    accessPending: false,
    portalPending: false,
    accessMessage: undefined,
    paidSession: undefined,
    sessionPending: Boolean(checkoutSessionId),
    isPending: false,
    isEnhancing: false,
    isGenerating: false,
    uploadedFiles: [],
    isUploading: false,
    uploadMessage: null,
    designVariations: [],
    chatMessages: [],
    activeVariationId: null,
    designRationale: null,
    leftPanelTab: "brief",
    enhanceError: null,
    chatError: null,
    isChatPending: false,
    savedDesigns: [],
    currentDesignId: null,
    clientName: getSpecBrand(initialSpec),
    jobName: defaultJobName(initialSpec.productType),
    isSaving: false,
    isLoadingDesigns: false,
    saveMessage: null,
  });

  const chatInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadIntentRef = useRef<UploadIntent>("reference");

  // Handle checkout session verification on mount
  useEffect(() => {
    if (!checkoutSessionId) {
      if (checkoutState === "cancelled") {
        dispatch({ type: "SET_ERROR", error: "Checkout was cancelled. Advanced export is still locked." });
      }
      return;
    }
    let cancelled = false;
    dispatch({ type: "SET_SESSION_PENDING", sessionPending: true });
    void (async () => {
      const response = await fetch(`/api/billing/session?session_id=${encodeURIComponent(checkoutSessionId)}`);
      const payload = (await response.json().catch(() => undefined)) as { session?: PaidSession; error?: string } | undefined;
      if (cancelled) return;
      if (!response.ok || !payload?.session) {
        dispatch({ type: "SET_ERROR", error: payload?.error ?? "Checkout could not be verified." });
      } else {
        dispatch({ type: "SET_PAID_SESSION", paidSession: payload.session });
        dispatch({ type: "SET_MODE", mode: "advanced" });
        trackEvent("checkout_verified", { entitlement: payload.session.entitlement });
      }
      dispatch({ type: "SET_SESSION_PENDING", sessionPending: false });
    })();
    return () => { cancelled = true; };
  }, [checkoutSessionId, checkoutState]);

  // Load uploads on mount
  useEffect(() => {
    void (async () => {
      try {
        const responses = await Promise.all([
          fetch("/api/upload?category=reference"),
          fetch("/api/upload?category=source")
        ]);
        const files = await Promise.all(
          responses.map(async (res) => {
            if (!res.ok) {
              return [];
            }
            const data = await res.json() as { files?: UploadedFile[] };
            return data.files || [];
          })
        );
        dispatch({ type: "SET_UPLOADED_FILES", files: files.flat() });
      } catch { /* noop */ }
    })();
  }, []);

  // Load saved designs on mount
  useEffect(() => {
    void loadSavedDesigns();
  }, []);

  function handleApplySampleBrief(sample: SampleBrief) {
    const sampleSpec = deriveLayoutSpecFromBrief({
      brief: sample.brief,
      productType: sample.productType,
      printProfile: state.printProfile,
      pdfxLevel: state.pdfxLevel,
      cropMarks: state.cropMarks
    });

    dispatch({ type: "SET_BRIEF", brief: sample.brief });
    dispatch({ type: "SET_PRODUCT_TYPE", productType: sample.productType });
    dispatch({ type: "SET_SPEC", spec: sampleSpec });
    dispatch({ type: "SET_ENHANCED_BRIEF", enhancedBrief: null });
    dispatch({ type: "SET_PROOF", proof: undefined });
    dispatch({ type: "SET_DESIGN_VARIATIONS", variations: [] });
    dispatch({ type: "SET_ACTIVE_VARIATION", variationId: null });
    dispatch({ type: "SET_DESIGN_RATIONALE", rationale: null });
    dispatch({ type: "SET_CURRENT_DESIGN_ID", id: null });
    dispatch({ type: "SET_CLIENT_NAME", clientName: getSpecBrand(sampleSpec) });
    dispatch({ type: "SET_JOB_NAME", jobName: defaultJobName(sample.productType) });
    dispatch({ type: "SET_SAVE_MESSAGE", message: null });
    dispatch({ type: "SET_ERROR", error: undefined });
    trackEvent("sample_brief_selected", {
      sample_id: sample.id,
      productType: sample.productType
    });
  }

  async function loadSavedDesigns() {
    dispatch({ type: "SET_IS_LOADING_DESIGNS", isLoading: true });
    try {
      const res = await fetch("/api/designs?limit=20");
      if (res.ok) {
        const data = await res.json() as { designs: SavedDesignSummary[] };
        dispatch({ type: "SET_SAVED_DESIGNS", designs: data.designs || [] });
      }
    } catch { /* noop */ }
    finally { dispatch({ type: "SET_IS_LOADING_DESIGNS", isLoading: false }); }
  }

  // ── Save / Load / Delete Designs ───────────────────────────────────────────

  async function handleSaveDesign() {
    if (state.isSaving) return;
    dispatch({ type: "SET_IS_SAVING", isSaving: true });
    dispatch({ type: "SET_SAVE_MESSAGE", message: null });
    try {
      const metadata = buildSavedDesignMetadata(state);
      const res = await fetch("/api/designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: state.currentDesignId || undefined,
          name: metadata.name,
          clientName: metadata.clientName,
          jobName: metadata.jobName,
          brief: state.brief,
          enhancedBrief: state.enhancedBrief,
          layoutSpec: state.spec,
          designRationale: state.designRationale,
          productType: state.productType,
          referenceImageUrls: state.uploadedFiles.map((file) => file.url),
          iterationCount: state.designVariations.length + 1,
        }),
      });
      const data = await res.json() as { success: boolean; id: string; error?: string };
      if (data.success && data.id) {
        dispatch({ type: "SET_CURRENT_DESIGN_ID", id: data.id });
        dispatch({ type: "SET_SAVE_MESSAGE", message: "Design saved." });
        trackEvent("design_generation_completed", { action: "save" });
        void loadSavedDesigns();
      } else {
        dispatch({ type: "SET_SAVE_MESSAGE", message: data.error || "Save failed." });
      }
    } catch {
      dispatch({ type: "SET_SAVE_MESSAGE", message: "Save failed." });
    } finally {
      dispatch({ type: "SET_IS_SAVING", isSaving: false });
    }
  }

  async function handleLoadDesign(designId: string) {
    dispatch({ type: "SET_ERROR", error: undefined });
    try {
      const res = await fetch(`/api/designs?id=${encodeURIComponent(designId)}`);
      const data = await res.json() as { design?: { layoutSpec: LayoutSpec; brief: string; enhancedBrief: BriefEnhancementResult | null; designRationale: string | null; productType: string; referenceImageUrls: string[]; clientName?: string; jobName?: string }; error?: string };
      if (data.design) {
        dispatch({ type: "SET_SPEC", spec: data.design.layoutSpec });
        dispatch({ type: "SET_BRIEF", brief: data.design.brief || state.brief });
        dispatch({ type: "SET_ENHANCED_BRIEF", enhancedBrief: data.design.enhancedBrief });
        if (data.design.designRationale) dispatch({ type: "SET_DESIGN_RATIONALE", rationale: data.design.designRationale });
        dispatch({ type: "SET_PRODUCT_TYPE", productType: (data.design.productType as ProductType) || state.productType });
        dispatch({ type: "SET_CURRENT_DESIGN_ID", id: designId });
        dispatch({ type: "SET_CLIENT_NAME", clientName: data.design.clientName || getSpecBrand(data.design.layoutSpec) });
        dispatch({ type: "SET_JOB_NAME", jobName: data.design.jobName || defaultJobName((data.design.productType as ProductType) || state.productType) });
        dispatch({ type: "SET_SAVE_MESSAGE", message: "Design loaded." });
        trackEvent("design_generation_completed", { action: "load" });
      } else {
        dispatch({ type: "SET_ERROR", error: data.error || "Failed to load design." });
      }
    } catch {
      dispatch({ type: "SET_ERROR", error: "Failed to load design." });
    }
  }

  async function handleDeleteDesign(designId: string) {
    try {
      const res = await fetch(`/api/designs?id=${encodeURIComponent(designId)}`, { method: "DELETE" });
      if (res.ok) {
        if (state.currentDesignId === designId) dispatch({ type: "SET_CURRENT_DESIGN_ID", id: null });
        void loadSavedDesigns();
        dispatch({ type: "SET_SAVE_MESSAGE", message: "Design deleted." });
      }
    } catch { /* noop */ }
  }

  // Silent save used for auto-save after generation (no UI messages)
  async function handleSaveDesignSilent(specOverride?: LayoutSpec, rationaleOverride?: string) {
    try {
      const metadata = buildSavedDesignMetadata(state, specOverride);
      const res = await fetch("/api/designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: metadata.name,
          clientName: metadata.clientName,
          jobName: metadata.jobName,
          brief: state.brief,
          enhancedBrief: state.enhancedBrief,
          layoutSpec: specOverride || state.spec,
          designRationale: rationaleOverride || state.designRationale,
          productType: state.productType,
          referenceImageUrls: state.uploadedFiles.map((file) => file.url),
          iterationCount: state.designVariations.length + 1,
        }),
      });
      const data = await res.json() as { success: boolean; id: string };
      if (data.success && data.id) {
        dispatch({ type: "SET_CURRENT_DESIGN_ID", id: data.id });
        void loadSavedDesigns();
      }
    } catch { /* silent */ }
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  async function handleEnhanceBrief() {
    if (!state.brief.trim() || state.isEnhancing) return;
    dispatch({ type: "SET_IS_ENHANCING", isEnhancing: true });
    dispatch({ type: "SET_ENHANCE_ERROR", error: null });
    trackEvent("brief_enhance_started", { brief_length: state.brief.length });

    try {
      const response = await fetch("/api/brief/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: state.brief,
          productType: state.productType,
          referenceImageDescriptions: getReferenceDescriptions(state.uploadedFiles),
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Enhancement failed" })) as { error?: string };
        throw new Error(err.error || "Enhancement failed");
      }

      const data = await response.json() as { success: boolean; enhancement: BriefEnhancementResult };
      dispatch({ type: "SET_ENHANCED_BRIEF", enhancedBrief: data.enhancement });
      trackEvent("brief_enhance_completed", { brand: data.enhancement.brandName });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to enhance brief";
      dispatch({ type: "SET_ENHANCE_ERROR", error: msg });
    } finally {
      dispatch({ type: "SET_IS_ENHANCING", isEnhancing: false });
    }
  }

  async function handleGenerateDesign() {
    if (!state.enhancedBrief || state.isGenerating) return;
    dispatch({ type: "SET_IS_GENERATING", isGenerating: true });
    dispatch({ type: "SET_ERROR", error: undefined });
    trackEvent("design_generation_started", { productType: state.productType });

    try {
      const response = await fetch("/api/design/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enhancedBrief: state.enhancedBrief,
          productType: state.productType,
          printProfile: state.printProfile,
          pdfxLevel: state.pdfxLevel,
          cropMarks: state.cropMarks,
          referenceImageUrls: getDesignReferenceImageUrls(state.uploadedFiles),
          designIteration: state.designVariations.length + 1,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Design generation failed" })) as { error?: string };
        throw new Error(err.error || "Design generation failed");
      }

      const data = await response.json() as {
        success: boolean;
        designId: string;
        layoutSpec: LayoutSpec;
        designRationale: string;
      };

      const variation: DesignVariation = {
        id: data.designId,
        layoutSpec: data.layoutSpec,
        designRationale: data.designRationale,
        iteration: state.designVariations.length + 1,
      };

      dispatch({ type: "ADD_DESIGN_VARIATION", variation });
      dispatch({ type: "SET_ACTIVE_VARIATION", variationId: variation.id });
      dispatch({ type: "SET_SPEC", spec: data.layoutSpec });
      dispatch({ type: "SET_DESIGN_RATIONALE", rationale: data.designRationale });

      // Auto-generate proof for the design
      await handleGenerateProof(data.layoutSpec, variation.id);

      trackEvent("design_generation_completed", { designId: data.designId });

      // Auto-save the design after generation
      dispatch({ type: "SET_CURRENT_DESIGN_ID", id: null }); // new design, will get new ID on save
      void handleSaveDesignSilent(data.layoutSpec, data.designRationale);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Design generation failed";
      dispatch({ type: "SET_ERROR", error: msg });
    } finally {
      dispatch({ type: "SET_IS_GENERATING", isGenerating: false });
    }
  }

  async function handleGenerateProof(specOverride?: LayoutSpec, variationId?: string) {
    const spec = specOverride || state.spec;
    if (state.mode === "advanced" && !state.paidSession) {
      dispatch({ type: "SET_ERROR", error: "Advanced export requires a Stripe export credit or subscription first." });
      return;
    }

    dispatch({ type: "SET_IS_PENDING", isPending: true });
    dispatch({ type: "SET_ERROR", error: undefined });

    try {
      trackEvent(state.mode === "dummy" ? "dummy_proof_started" : "proof_export_started", { mode: state.mode });
      const response = await fetch("/api/exports/proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: state.brief,
          spec,
          mode: state.mode,
          checkoutSessionId: state.paidSession?.id,
          analytics: getAnalyticsAttribution(),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => undefined) as { error?: string } | undefined;
        throw new Error(payload?.error ?? "Proof generation failed.");
      }

      const payload = await response.json() as ProofApiResponse;

      if (variationId) {
        dispatch({ type: "UPDATE_VARIATION_PROOF", variationId, proof: payload });
      } else {
        dispatch({ type: "SET_PROOF", proof: payload });
      }

      if (state.mode === "advanced" && state.paidSession?.entitlement === "export_credit") {
        dispatch({ type: "SET_PAID_SESSION", paidSession: undefined });
      }

      trackEvent("proof_export_completed", { mode: state.mode, status: payload.report.status });
    } catch (error) {
      dispatch({ type: "SET_ERROR", error: error instanceof Error ? error.message : "Proof generation failed." });
    } finally {
      dispatch({ type: "SET_IS_PENDING", isPending: false });
    }
  }

  function startFileUpload(intent: UploadIntent) {
    uploadIntentRef.current = intent;
    fileInputRef.current?.click();
  }

  function applyUploadedFileAsSource(file: UploadedFile) {
    const productType = inferProductTypeFromFileName(file.name, state.productType);
    const brief = buildUploadedFileBrief(file, productType);
    const spec = deriveLayoutSpecFromBrief({
      brief,
      productType,
      printProfile: state.printProfile,
      pdfxLevel: state.pdfxLevel,
      cropMarks: state.cropMarks
    });

    dispatch({ type: "SET_BRIEF", brief });
    dispatch({ type: "SET_PRODUCT_TYPE", productType });
    dispatch({ type: "SET_SPEC", spec });
    dispatch({ type: "SET_ENHANCED_BRIEF", enhancedBrief: null });
    dispatch({ type: "SET_PROOF", proof: undefined });
    dispatch({ type: "SET_DESIGN_VARIATIONS", variations: [] });
    dispatch({ type: "SET_ACTIVE_VARIATION", variationId: null });
    dispatch({ type: "SET_DESIGN_RATIONALE", rationale: null });
    dispatch({ type: "SET_CURRENT_DESIGN_ID", id: null });
    dispatch({ type: "SET_CLIENT_NAME", clientName: getUploadDisplayName(file) });
    dispatch({ type: "SET_JOB_NAME", jobName: `${PRODUCT_PROFILES[productType].label} rebuild proof` });
    dispatch({ type: "SET_LEFT_PANEL_TAB", tab: "brief" });
    dispatch({ type: "SET_SAVE_MESSAGE", message: null });
    dispatch({ type: "SET_ERROR", error: undefined });
    trackEvent("source_file_applied", {
      file_type: file.contentType,
      productType
    });
  }

  function applyPrintWorkflowPreset(presetId: PrintWorkflowPresetId) {
    const preset = PRINT_WORKFLOW_PRESETS[presetId];
    dispatch({ type: "SET_PRINT_PROFILE", printProfile: preset.printProfile });
    dispatch({ type: "SET_PDFX_LEVEL", pdfxLevel: preset.pdfxLevel });
    dispatch({ type: "SET_CROP_MARKS", cropMarks: preset.cropMarks });
    dispatch({ type: "SET_ERROR", error: undefined });
  }

  async function handleUpload(file: File) {
    const intent = file.type === "application/pdf" ? "source" : uploadIntentRef.current;
    const category: UploadCategory = intent === "source" ? "source" : "reference";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);

    try {
      dispatch({ type: "SET_IS_UPLOADING", isUploading: true });
      dispatch({ type: "SET_UPLOAD_MESSAGE", message: null });
      dispatch({ type: "SET_ERROR", error: undefined });
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Upload failed" })) as { error?: string };
        throw new Error(err.error || "Upload failed");
      }
      const data = await response.json() as { success: boolean; fileId: string; url: string; originalName: string; size: number; contentType: string; category?: UploadCategory };
      const uploadedFile: UploadedFile = {
        id: data.fileId,
        name: data.originalName,
        url: data.url,
        size: data.size,
        contentType: data.contentType,
        category: data.category ?? category
      };
      dispatch({ type: "ADD_UPLOADED_FILE", file: uploadedFile });
      if (category === "source") {
        applyUploadedFileAsSource(uploadedFile);
        dispatch({ type: "SET_UPLOAD_MESSAGE", message: "Brief started from uploaded customer file." });
        trackEvent("source_file_uploaded", { file_type: data.contentType });
      } else {
        dispatch({ type: "SET_UPLOAD_MESSAGE", message: "Reference image uploaded." });
        trackEvent("reference_image_uploaded", { file_type: data.contentType });
      }
    } catch (error) {
      dispatch({ type: "SET_ERROR", error: error instanceof Error ? error.message : "Upload failed." });
    } finally {
      dispatch({ type: "SET_IS_UPLOADING", isUploading: false });
      uploadIntentRef.current = "reference";
    }
  }

  async function handleDeleteUpload(fileId: string) {
    dispatch({ type: "REMOVE_UPLOADED_FILE", fileId });
  }

  async function handleChatSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = chatInputRef.current;
    if (!input?.value.trim() || state.isChatPending) return;

    const userMessage: ChatMessage = { role: "user", content: input.value.trim() };
    dispatch({ type: "ADD_CHAT_MESSAGE", message: userMessage });
    dispatch({ type: "SET_IS_CHAT_PENDING", isChatPending: true });
    dispatch({ type: "SET_CHAT_ERROR", error: null });
    input.value = "";

    const activeVariation = state.designVariations.find(v => v.id === state.activeVariationId);
    const currentMessages = [...state.chatMessages, userMessage];

    try {
      const response = await fetch("/api/design/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: currentMessages,
          context: {
            brief: state.brief,
            enhancedBrief: state.enhancedBrief || undefined,
            currentSpec: activeVariation?.layoutSpec || state.spec,
            designRationale: activeVariation?.designRationale || state.designRationale || undefined,
            iteration: state.designVariations.length + 1,
            productType: state.productType,
          },
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Chat failed" })) as { error?: string };
        throw new Error(err.error || "Chat failed");
      }

      const data = await response.json() as {
        success: boolean;
        message: string;
        specChanges?: Partial<LayoutSpec>;
        newAssetSlots?: LayoutSpec["assetSlots"];
        newTextBlocks?: LayoutSpec["textBlocks"];
        newStyleDirection?: string;
        suggestedAction?: string;
      };

      dispatch({ type: "ADD_CHAT_MESSAGE", message: { role: "assistant", content: data.message } });

      // Apply changes if any
      if (data.newTextBlocks || data.newAssetSlots || data.newStyleDirection) {
        const updatedSpec: LayoutSpec = {
          ...(activeVariation?.layoutSpec || state.spec),
          ...(data.newTextBlocks ? { textBlocks: data.newTextBlocks } : {}),
          ...(data.newAssetSlots ? { assetSlots: data.newAssetSlots } : {}),
          ...(data.newStyleDirection ? { styleDirection: data.newStyleDirection } : {}),
        };
        dispatch({ type: "SET_SPEC", spec: updatedSpec });

        // Create a new variation for the change
        const newVariation: DesignVariation = {
          id: crypto.randomUUID?.() || `var-${Date.now()}`,
          layoutSpec: updatedSpec,
          designRationale: data.message,
          iteration: state.designVariations.length + 1,
        };
        dispatch({ type: "ADD_DESIGN_VARIATION", variation: newVariation });
        dispatch({ type: "SET_ACTIVE_VARIATION", variationId: newVariation.id });
      }

      if (data.suggestedAction === "regenerate") {
        await handleGenerateDesign();
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Chat failed";
      dispatch({ type: "SET_CHAT_ERROR", error: msg });
    } finally {
      dispatch({ type: "SET_IS_CHAT_PENDING", isChatPending: false });
    }
  }

  async function startCheckout(mode: CheckoutMode) {
    dispatch({ type: "SET_ERROR", error: undefined });
    dispatch({ type: "SET_ACCESS_MESSAGE", accessMessage: undefined });
    dispatch({ type: "SET_CHECKOUT_PENDING", checkoutPending: mode });
    trackEvent("checkout_started", { mode });
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, email: accountEmail.toLowerCase(), analytics: getAnalyticsAttribution() }),
      });
      const payload = await response.json().catch(() => undefined) as { url?: string; error?: string } | undefined;
      if (!response.ok || !payload?.url) {
        dispatch({ type: "SET_ERROR", error: payload?.error ?? "Stripe checkout could not start." });
        return;
      }
      window.location.href = payload.url;
    } finally {
      dispatch({ type: "SET_CHECKOUT_PENDING", checkoutPending: undefined });
    }
  }

  async function sendAccessLink() {
    dispatch({ type: "SET_ERROR", error: undefined });
    dispatch({ type: "SET_ACCESS_MESSAGE", accessMessage: undefined });
    dispatch({ type: "SET_ACCESS_PENDING", accessPending: true });
    try {
      const response = await fetch("/api/billing/access-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: accountEmail.toLowerCase() }),
      });
      const payload = await response.json().catch(() => undefined) as { matched?: boolean; error?: string; email?: { status?: string } } | undefined;
      if (!response.ok) {
        dispatch({ type: "SET_ERROR", error: payload?.error ?? "Access link request failed." });
        return;
      }
      if (payload?.matched && payload.email?.status === "sent") {
        dispatch({ type: "SET_ACCESS_MESSAGE", accessMessage: "Access link sent. Check your inbox." });
      } else if (payload?.matched) {
        dispatch({ type: "SET_ACCESS_MESSAGE", accessMessage: "Access was found, but email delivery is not configured." });
      } else {
        dispatch({ type: "SET_ACCESS_MESSAGE", accessMessage: "No unused credit or active subscription was found for that email." });
      }
    } finally {
      dispatch({ type: "SET_ACCESS_PENDING", accessPending: false });
    }
  }

  async function manageSubscription() {
    if (!state.paidSession || state.paidSession.entitlement !== "subscription") {
      dispatch({ type: "SET_ERROR", error: "Verify a Pro checkout session before opening subscription management." });
      return;
    }
    dispatch({ type: "SET_PORTAL_PENDING", portalPending: true });
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: state.paidSession.id }),
      });
      const payload = await response.json().catch(() => undefined) as { url?: string; error?: string } | undefined;
      if (!response.ok || !payload?.url) {
        dispatch({ type: "SET_ERROR", error: payload?.error ?? "Subscription management could not start." });
        return;
      }
      window.location.href = payload.url;
    } finally {
      dispatch({ type: "SET_PORTAL_PENDING", portalPending: false });
    }
  }

  const activeVariation = state.designVariations.find(v => v.id === state.activeVariationId);
  const currentProof = activeVariation?.proof || state.proof;
  const proofReportUrl = currentProof?.reportHtmlUrl ?? currentProof?.reportUrl;
  const proofCheckCounts = currentProof ? getProofCheckCounts(currentProof.report) : undefined;
  const advancedLocked = state.mode === "advanced" && !state.paidSession;
  const selectedSampleId = sampleBriefs.find((sample) => sample.brief === state.brief)?.id;
  const activePrintPresetId = getActivePrintWorkflowPreset(state);
  const activePrintPreset = activePrintPresetId ? PRINT_WORKFLOW_PRESETS[activePrintPresetId] : undefined;
  const activePrintPresetSummary = activePrintPresetId
    ? getPrintWorkflowPresetSummary(state.productType, activePrintPresetId)
    : undefined;
  const readinessChecks = [
    {
      label: "Brand and print job named",
      complete: state.brief.trim().length >= 80 && /brand\s*:/i.test(state.brief)
    },
    {
      label: `${PRODUCT_PROFILES[state.productType].label} profile selected`,
      complete: Boolean(state.productType)
    },
    {
      label: `${state.pdfxLevel} target set`,
      complete: Boolean(state.pdfxLevel)
    },
    {
      label: currentProof ? `Preflight ${currentProof.report.status.replace("_", " ")}` : "Proof report pending",
      complete: Boolean(currentProof)
    }
  ];

  return (
    <main className="min-h-screen overflow-auto p-2 text-foreground xl:h-screen xl:overflow-hidden">
      <div className="mx-auto flex min-h-[calc(100vh-1rem)] max-w-[1600px] flex-col overflow-hidden rounded-[8px] border border-border bg-surface shadow-[0_20px_70px_oklch(0.18_0.02_252_/_0.12)] xl:h-full">
        {/* Header */}
        <header className="flex min-h-14 shrink-0 flex-col gap-2 border-b border-border bg-surface px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-[8px] bg-surface-ink text-white">
              <Box aria-hidden className="h-4 w-4" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-surface-ink">Trim Proof</h1>
              <p className="text-xs font-medium text-muted">AI-powered print design studio</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted sm:gap-3">
            <span className="rounded-[6px] border border-border bg-surface px-2.5 py-1">GPT Image 2</span>
            <span className="rounded-[6px] border border-border bg-surface px-2.5 py-1">Nano Banana Pro</span>
            <span className="rounded-[6px] border border-border bg-surface px-2.5 py-1">{state.spec.pdfxLevel}</span>
            <Link className="rounded-[6px] border border-border bg-surface px-2.5 py-1 transition hover:text-surface-ink" href="/privacy">
              Privacy
            </Link>
          </div>
        </header>

        {/* Error banner */}
        {state.error ? (
          <div className="shrink-0 border-b border-danger/30 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger flex items-center justify-between">
            <span>{state.error}</span>
            <button onClick={() => dispatch({ type: "SET_ERROR", error: undefined })} className="text-danger/70 hover:text-danger">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {state.sessionPending ? (
          <div className="shrink-0 border-b border-brand/20 bg-brand-soft px-4 py-2 text-sm font-semibold text-brand">Verifying checkout session...</div>
        ) : null}

        {/* Main content */}
        <div className="flex min-h-0 flex-1 flex-col overflow-visible xl:flex-row xl:overflow-hidden">
          {/* LEFT PANEL: Brief Studio + Uploads + Specs */}
          <aside className="flex w-full shrink-0 flex-col overflow-hidden bg-surface-strong/75 xl:w-[340px]">
            {/* Tabs */}
            <div className="flex shrink-0 border-b border-border">
              {([
                ["brief", "Brief", Sparkles],
                ["uploads", "Uploads", ImagePlus],
                ["specs", "Specs", Layers3],
              ] as const).map(([tab, label, Icon]) => (
                <button
                  key={tab}
                  className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition ${
                    state.leftPanelTab === tab
                      ? "border-b-2 border-accent text-accent bg-accent/5"
                      : "text-muted hover:text-surface-ink"
                  }`}
                  onClick={() => dispatch({ type: "SET_LEFT_PANEL_TAB", tab })}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
            <input
              ref={fileInputRef}
              className="hidden"
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp,image/gif,image/heic,image/heif"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
                e.target.value = "";
              }}
            />

            {/* Tab content */}
            <div className="min-h-0 flex-1 overflow-auto">
              {state.leftPanelTab === "brief" && (
                <div className="space-y-3 p-3">
                  <div className="rounded-[8px] border border-accent/25 bg-accent/5 p-2.5">
                    <div className="flex items-start gap-2">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[7px] bg-surface text-accent">
                        <Upload aria-hidden className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-display text-sm font-semibold text-surface-ink">Start with a customer file</h3>
                        <p className="mt-1 text-xs leading-5 text-muted">
                          Upload an existing PDF or image first. Trim Proof uses it as source material and rebuilds a checked proof.
                        </p>
                      </div>
                    </div>
                    <button
                      className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-[8px] bg-surface-ink px-3 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                      disabled={state.isUploading}
                      onClick={() => startFileUpload("source")}
                    >
                      {state.isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                      {state.isUploading ? "Uploading..." : "Upload PDF or image"}
                    </button>
                  </div>

                  {/* Brief textarea */}
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted">Design Brief</label>
                    <textarea
                      value={state.brief}
                      onChange={(e) => dispatch({ type: "SET_BRIEF", brief: e.target.value })}
                      className="mt-1 h-[clamp(5rem,14vh,7rem)] w-full resize-none rounded-[8px] border border-border bg-surface p-3 text-sm leading-5 text-surface-ink shadow-sm focus:border-accent focus:outline-none"
                      placeholder="Describe what you want to create... e.g., A modern business card for a coffee roastery with earthy tones and a minimalist logo"
                    />
                  </div>

                  <div className="rounded-[8px] border border-border bg-surface p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-sm font-semibold text-surface-ink">Sample briefs</h3>
                      <span className="text-[10px] font-bold uppercase text-muted">Apply to proof</span>
                    </div>
                    <div className="mt-2 grid gap-1.5">
                      {sampleBriefs.map((sample) => (
                        <button
                          key={sample.id}
                          className={`rounded-[7px] border px-2.5 py-2 text-left transition hover:border-accent ${
                            selectedSampleId === sample.id
                              ? "border-accent bg-accent/10 text-surface-ink"
                              : "border-border bg-background text-muted"
                          }`}
                          type="button"
                          onClick={() => handleApplySampleBrief(sample)}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="font-display text-sm font-bold text-surface-ink">{sample.name}</span>
                            <span className="rounded-[5px] bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand">
                              {PRODUCT_PROFILES[sample.productType].label}
                            </span>
                          </span>
                          <span className="mt-1 block text-xs leading-5">{sample.goal}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[8px] border border-border bg-background p-2.5">
                    <h3 className="font-display text-sm font-semibold text-surface-ink">Proof readiness</h3>
                    <ul className="mt-2 grid gap-1.5">
                      {readinessChecks.map((check) => (
                        <li key={check.label} className="flex items-center gap-2 text-xs font-semibold text-surface-ink">
                          <CheckCircle2
                            aria-hidden
                            className={`h-4 w-4 shrink-0 ${check.complete ? "text-success" : "text-muted/45"}`}
                          />
                          <span className={check.complete ? "" : "text-muted"}>{check.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Enhance button */}
                  <button
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-accent px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                    disabled={state.isEnhancing || state.brief.trim().length < 3}
                    onClick={handleEnhanceBrief}
                  >
                    {state.isEnhancing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )}
                    {state.isEnhancing ? "Enhancing..." : "Enhance with AI"}
                  </button>

                  {state.enhanceError ? (
                    <div className="rounded-[8px] border border-danger/30 bg-danger/5 p-3 text-xs text-danger">{state.enhanceError}</div>
                  ) : null}

                  {/* Enhanced brief results */}
                  {state.enhancedBrief ? (
                    <div className="space-y-3 rounded-[8px] border border-accent/30 bg-accent/5 p-3">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-accent" />
                        <h3 className="font-display text-sm font-semibold text-accent">AI Enhancement</h3>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="font-semibold text-muted">Brand:</span>{" "}
                          <span className="text-surface-ink">{state.enhancedBrief.brandName}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-muted">Style:</span>{" "}
                          <span className="text-surface-ink">{state.enhancedBrief.styleDirection}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-muted">Palette:</span>{" "}
                          <span className="text-surface-ink">{state.enhancedBrief.colorPalette.name}</span>
                          <div className="mt-1 flex gap-1.5">
                            {[
                              state.enhancedBrief.colorPalette.primary,
                              state.enhancedBrief.colorPalette.secondary,
                              state.enhancedBrief.colorPalette.accent,
                              state.enhancedBrief.colorPalette.background,
                            ].map((c, i) => (
                              <div key={i} className="h-5 w-5 rounded-[4px] border border-border" style={{ backgroundColor: c }} title={c} />
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="font-semibold text-muted">Headline:</span>{" "}
                          <span className="text-surface-ink">{state.enhancedBrief.suggestedContent.headline}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-muted">Design notes:</span>
                          <ul className="mt-1 list-inside list-disc space-y-0.5 text-surface-ink">
                            {state.enhancedBrief.designNotes.map((n, i) => (
                              <li key={i}>{n}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Generate design button */}
                  {state.enhancedBrief ? (
                    <button
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-surface-ink px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                      disabled={state.isGenerating}
                      onClick={handleGenerateDesign}
                    >
                      {state.isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      {state.isGenerating ? "Generating..." : "Generate Design"}
                    </button>
                  ) : null}
                </div>
              )}

              {state.leftPanelTab === "uploads" && (
                <div className="space-y-3 p-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-sm font-semibold text-surface-ink">Customer files</h3>
                    <span className="text-xs text-muted">{state.uploadedFiles.length} files</span>
                  </div>
                  <p className="text-xs leading-5 text-muted">
                    Upload source PDFs, customer screenshots, logos, or inspiration images. Source files can start a brief; images can also guide AI art.
                  </p>

                  {/* Upload button */}
                  <div className="grid gap-2">
                    <button
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border-2 border-dashed border-accent/40 bg-accent/5 px-4 text-sm font-semibold text-accent transition hover:border-accent disabled:opacity-60"
                      disabled={state.isUploading}
                      onClick={() => startFileUpload("source")}
                    >
                      {state.isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {state.isUploading ? "Uploading..." : "Upload customer PDF or image"}
                    </button>
                    <button
                      className="flex h-9 w-full items-center justify-center gap-2 rounded-[8px] border border-border bg-surface px-4 text-xs font-semibold text-muted transition hover:border-accent hover:text-accent disabled:opacity-60"
                      disabled={state.isUploading}
                      onClick={() => startFileUpload("reference")}
                    >
                      <ImagePlus className="h-3.5 w-3.5" />
                      Add logo or reference image
                    </button>
                  </div>

                  {state.uploadMessage ? (
                    <div className="rounded-[8px] border border-success/30 bg-success/10 p-2 text-xs font-semibold text-success">
                      {state.uploadMessage}
                    </div>
                  ) : null}

                  {/* Uploaded files list */}
                  {state.uploadedFiles.length > 0 ? (
                    <div className="space-y-2">
                      {state.uploadedFiles.map((file) => (
                        <div key={file.id} className="rounded-[8px] border border-border bg-surface p-2">
                          <div className="flex items-center gap-2">
                            <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[6px] bg-surface-strong">
                              {canPreviewUploadedImage(file) ? (
                                <Image
                                  src={file.url}
                                  alt={file.name}
                                  width={40}
                                  height={40}
                                  className="h-full w-full object-cover"
                                  unoptimized
                                />
                              ) : (
                                <FileText aria-hidden className="h-5 w-5 text-muted" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-xs font-semibold text-surface-ink">{file.name}</div>
                              <div className="text-[10px] text-muted">
                                {isPdfUpload(file) ? "PDF source" : "Image reference"} · {formatFileSize(file.size)}
                              </div>
                            </div>
                            <button
                              aria-label={`Remove ${file.name}`}
                              className="shrink-0 rounded-[4px] p-1 text-muted hover:bg-danger/10 hover:text-danger"
                              onClick={() => handleDeleteUpload(file.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <button
                            className="mt-2 flex h-8 w-full items-center justify-center rounded-[7px] border border-border bg-background px-3 text-xs font-semibold text-surface-ink hover:border-accent hover:text-accent"
                            onClick={() => applyUploadedFileAsSource(file)}
                          >
                            Use as starting point
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[8px] border border-border bg-surface p-6 text-center">
                      <ImagePlus className="mx-auto h-8 w-8 text-muted/40" />
                      <p className="mt-2 text-xs text-muted">No customer files uploaded yet</p>
                    </div>
                  )}
                </div>
              )}

              {state.leftPanelTab === "specs" && (
                <div className="space-y-3 p-3">
                  {/* Product type */}
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted">Product</label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {(Object.keys(PRODUCT_PROFILES) as ProductType[]).map((product) => (
                        <button
                          key={product}
                          className={`rounded-[8px] border px-3 py-1.5 text-left text-xs font-semibold ${
                            state.productType === product ? "border-brand bg-brand-soft text-brand" : "border-border bg-surface text-muted"
                          }`}
                          onClick={() => dispatch({ type: "SET_PRODUCT_TYPE", productType: product })}
                        >
                          {PRODUCT_PROFILES[product].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Print workflow presets */}
                  <div className="rounded-[8px] border border-border bg-surface p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-sm font-semibold text-surface-ink">Shop preset</h3>
                      <span className="text-[10px] font-bold uppercase text-muted">
                        {activePrintPreset?.shortLabel ?? "Custom"}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-1.5">
                      {(Object.keys(PRINT_WORKFLOW_PRESETS) as PrintWorkflowPresetId[]).map((presetId) => {
                        const preset = PRINT_WORKFLOW_PRESETS[presetId];
                        const summary = getPrintWorkflowPresetSummary(state.productType, presetId);

                        return (
                          <button
                            key={presetId}
                            className={`rounded-[8px] border px-2.5 py-2 text-left transition hover:border-accent ${
                              activePrintPresetId === presetId
                                ? "border-accent bg-accent/10 text-surface-ink"
                                : "border-border bg-background text-muted"
                            }`}
                            onClick={() => applyPrintWorkflowPreset(presetId)}
                            type="button"
                          >
                            <span className="flex items-center justify-between gap-2">
                              <span className="font-display text-sm font-bold text-surface-ink">{preset.label}</span>
                              <span className="text-[10px] font-bold uppercase text-muted">{summary.cropMarks}</span>
                            </span>
                            <span className="mt-1 block text-xs leading-5">
                              {summary.printProfile} · {summary.pdfxLevel}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {activePrintPresetSummary ? (
                      <div className="mt-2 rounded-[7px] border border-border bg-background p-2 text-xs leading-5">
                        <div className="font-semibold text-surface-ink">{activePrintPresetSummary.trim}</div>
                        <div className="text-muted">
                          {activePrintPresetSummary.bleed} · {activePrintPresetSummary.safeMargin}
                        </div>
                        <div className="mt-1 text-muted">{activePrintPresetSummary.colorWorkflow}</div>
                      </div>
                    ) : (
                      <div className="mt-2 rounded-[7px] border border-border bg-background p-2 text-xs leading-5 text-muted">
                        Custom settings are active. Confirm bleed, trim, safe area, crop marks, and color workflow with the printer before production.
                      </div>
                    )}
                  </div>

                  {/* Proof mode */}
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted">Proof mode</label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {(["dummy", "advanced"] as const).map((mode) => (
                        <button
                          key={mode}
                          className={`rounded-[8px] border px-3 py-1.5 text-left text-xs font-semibold ${
                            state.mode === mode ? "border-accent bg-accent/10 text-accent" : "border-border bg-surface text-muted"
                          }`}
                          onClick={() => dispatch({ type: "SET_MODE", mode })}
                        >
                          {mode === "dummy" ? "Dummy proof" : "Advanced"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Advanced settings */}
                  {state.mode === "advanced" ? (
                    <div className="rounded-[8px] border border-brand/30 bg-brand-soft/60 p-3 space-y-2">
                      <h3 className="font-display text-sm font-semibold text-brand">Advanced export</h3>
                      <div>
                        <label className="text-xs font-semibold uppercase text-muted">PDF/X target</label>
                        <select
                          className="mt-1 h-8 w-full rounded-[8px] border border-border bg-surface px-2 text-xs font-semibold text-surface-ink"
                          value={state.pdfxLevel}
                          onChange={(e) => dispatch({ type: "SET_PDFX_LEVEL", pdfxLevel: e.target.value as PdfxLevel })}
                        >
                          <option value="PDF/X-1a:2001">PDF/X-1a:2001</option>
                          <option value="PDF/X-4">PDF/X-4</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase text-muted">Output profile</label>
                        <select
                          className="mt-1 h-8 w-full rounded-[8px] border border-border bg-surface px-2 text-xs font-semibold text-surface-ink"
                          value={state.printProfile}
                          onChange={(e) => dispatch({ type: "SET_PRINT_PROFILE", printProfile: e.target.value as PrintProfileId })}
                        >
                          {(Object.keys(PRINT_PROFILES) as PrintProfileId[]).map((profile) => (
                            <option key={profile} value={profile}>{PRINT_PROFILES[profile].label}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        aria-pressed={state.cropMarks}
                        className={`flex h-8 w-full items-center justify-between rounded-[8px] border px-3 text-xs font-semibold ${
                          state.cropMarks ? "border-success bg-success/10 text-success" : "border-border bg-surface text-muted"
                        }`}
                        onClick={() => dispatch({ type: "SET_CROP_MARKS", cropMarks: !state.cropMarks })}
                      >
                        <span>Crop marks</span>
                        <span>{state.cropMarks ? "On" : "Off"}</span>
                      </button>
                    </div>
                  ) : null}

                  {/* Current layout summary */}
                  <div className="rounded-[8px] border border-border bg-surface p-2.5">
                    <h3 className="mb-2 font-display text-sm font-semibold">Layout Spec</h3>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted">Text blocks</span>
                        <span className="font-semibold text-surface-ink">{state.spec.textBlocks.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Asset slots</span>
                        <span className="font-semibold text-surface-ink">{state.spec.assetSlots.length}</span>
                      </div>
                      {state.designRationale ? (
                        <div className="mt-2 border-t border-border pt-2">
                          <span className="text-muted">Rationale:</span>
                          <p className="mt-1 text-surface-ink leading-relaxed">{state.designRationale}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* CENTER: Design Preview */}
          <PrintPreview
            assetProvider={currentProof?.assetUrls?.[0]?.provider}
            assetUrl={currentProof?.assetUrls?.[0]?.previewUrl ?? currentProof?.assetUrls?.[0]?.url}
            demoArtWatermarked={currentProof?.demoArtWatermarked}
            spec={state.spec}
          />

          {/* RIGHT PANEL: AI Chat + Export */}
          <aside className="flex w-full shrink-0 flex-col overflow-hidden bg-surface-strong/75 xl:w-[380px]">
            {/* Design Variations */}
            {state.designVariations.length > 0 ? (
              <div className="shrink-0 border-b border-border p-3">
                <h3 className="mb-2 flex items-center gap-2 font-display text-sm font-semibold text-surface-ink">
                  <Palette className="h-4 w-4 text-accent" />
                  Designs ({state.designVariations.length})
                </h3>
                <div className="flex gap-2 overflow-x-auto">
                  {state.designVariations.map((v) => (
                    <button
                      key={v.id}
                      className={`shrink-0 rounded-[8px] border px-3 py-1.5 text-xs font-semibold transition ${
                        state.activeVariationId === v.id
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border bg-surface text-muted hover:text-surface-ink"
                      }`}
                      onClick={() => {
                        dispatch({ type: "SET_ACTIVE_VARIATION", variationId: v.id });
                        dispatch({ type: "SET_SPEC", spec: v.layoutSpec });
                        dispatch({ type: "SET_DESIGN_RATIONALE", rationale: v.designRationale });
                        if (v.proof) dispatch({ type: "SET_PROOF", proof: v.proof });
                      }}
                    >
                      v{v.iteration}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* AI Chat Panel */}
            <div className="flex min-h-0 flex-1 flex-col border-b border-border">
              <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2.5">
                <MessageSquare className="h-4 w-4 text-accent" />
                <h2 className="font-display text-sm font-semibold text-surface-ink">Design Chat</h2>
                <span className="text-[10px] text-muted">Ask AI to tweak your design</span>
              </div>

              {/* Chat messages */}
              <div className="min-h-0 flex-1 overflow-auto p-3 space-y-2">
                {state.chatMessages.length === 0 ? (
                  <div className="rounded-[8px] border border-border bg-surface p-4 text-center">
                    <MessageSquare className="mx-auto h-6 w-6 text-muted/40" />
                    <p className="mt-2 text-xs text-muted">
                      Chat with the AI designer to refine your layout.
                    </p>
                    <p className="mt-1 text-[10px] text-muted/60">
                      Try: &quot;Make the logo bigger&quot;, &quot;Change to a dark theme&quot;, &quot;Add more white space&quot;
                    </p>
                  </div>
                ) : (
                  state.chatMessages.map((msg, i) => {
                    const bubbleClass =
                      msg.role === "user"
                        ? "ml-8 bg-accent/10 border border-accent/20 text-surface-ink"
                        : "mr-8 bg-surface border border-border text-surface-ink";
                    return (
                    <div
                      key={i}
                      className={`rounded-[8px] p-2.5 text-xs leading-relaxed ${bubbleClass}`}
                    >
                      <div className="mb-1 font-semibold text-muted">
                        {msg.role === "user" ? "You" : "AI Designer"}
                      </div>
                      {msg.content}
                    </div>
                    );
                  })
                )}
                {state.isChatPending ? (
                  <div className="mr-8 rounded-[8px] bg-surface border border-border p-2.5 text-xs text-muted">
                    <Loader2 className="mr-2 inline h-3 w-3 animate-spin" />
                    AI is thinking...
                  </div>
                ) : null}
                {state.chatError ? (
                  <div className="rounded-[8px] border border-danger/30 bg-danger/5 p-2.5 text-xs text-danger">{state.chatError}</div>
                ) : null}
              </div>

              {/* Chat input */}
              <form onSubmit={handleChatSubmit} className="shrink-0 border-t border-border p-3">
                <div className="flex gap-2">
                  <input
                    ref={chatInputRef}
                    className="h-9 flex-1 rounded-[8px] border border-border bg-surface px-3 text-xs text-surface-ink placeholder:text-muted focus:border-accent focus:outline-none"
                    placeholder='e.g. "Make the logo bigger and use warmer colors"'
                    disabled={state.isChatPending}
                  />
                  <button
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-accent text-white transition hover:opacity-90 disabled:opacity-60"
                    disabled={state.isChatPending}
                    type="submit"
                  >
                    {state.isChatPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </form>
            </div>

            {/* Export / Billing */}
            <div className="shrink-0 p-3 space-y-2">
              {/* Generate proof */}
              <button
                className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-surface-ink px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                disabled={state.isPending}
                onClick={() => handleGenerateProof()}
              >
                {state.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {advancedLocked ? "Unlock export first" : currentProof ? "Regenerate proof" : "Generate press proof"}
              </button>

              {currentProof && proofCheckCounts && proofReportUrl ? (
                <div className="rounded-[8px] border border-border bg-background p-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-sm font-semibold text-surface-ink">
                        Preflight {formatPreflightStatus(currentProof.report.status).toLowerCase()}
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-muted">
                        {proofCheckCounts.passed}/{proofCheckCounts.total} checks passed · {proofCheckCounts.needsAttention + proofCheckCounts.failed} to review
                      </p>
                    </div>
                    <FileText aria-hidden className="h-4 w-4 shrink-0 text-accent" />
                  </div>
                  <div className="mt-2 grid gap-1.5">
                    <a
                      className="flex h-9 w-full items-center justify-center gap-2 rounded-[7px] border border-accent/35 bg-accent/5 px-3 text-xs font-bold text-accent hover:bg-accent/10"
                      href={proofReportUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Open preflight report
                    </a>
                    {currentProof.reportTextUrl ? (
                      <a
                        className="flex h-8 w-full items-center justify-center gap-2 rounded-[7px] border border-border bg-surface px-3 text-xs font-semibold text-surface-ink hover:bg-surface-strong"
                        download
                        href={currentProof.reportTextUrl}
                      >
                        Download text summary
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* Download */}
              {currentProof?.downloadUrl ? (
                <a
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-border bg-surface px-4 text-sm font-semibold text-surface-ink hover:bg-surface-strong"
                  href={currentProof.downloadUrl}
                >
                  <Download className="h-4 w-4" />
                  Download PDF/X proof
                </a>
              ) : null}

              {currentProof?.productionDownloadLocked ? (
                <div className="rounded-[8px] border border-brand/30 bg-brand-soft px-3 py-2 text-xs font-semibold leading-5 text-brand">
                  Demo art is watermarked. Buy an export credit or start Pro to download a clean PDF/X proof.
                </div>
              ) : null}

              {/* Client / Job Metadata */}
              <div className="rounded-[8px] border border-border bg-surface p-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-brand" />
                  <h3 className="font-display text-sm font-semibold text-surface-ink">Client job</h3>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  <label className="grid gap-1">
                    <span className="text-[10px] font-bold uppercase text-muted">Client</span>
                    <input
                      className="h-8 rounded-[8px] border border-border bg-background px-2.5 text-xs font-semibold text-surface-ink placeholder:text-muted/70 focus:border-accent focus:outline-none"
                      maxLength={140}
                      onChange={(event) => dispatch({ type: "SET_CLIENT_NAME", clientName: event.target.value })}
                      placeholder="Client or company"
                      value={state.clientName}
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[10px] font-bold uppercase text-muted">Job</span>
                    <input
                      className="h-8 rounded-[8px] border border-border bg-background px-2.5 text-xs font-semibold text-surface-ink placeholder:text-muted/70 focus:border-accent focus:outline-none"
                      maxLength={140}
                      onChange={(event) => dispatch({ type: "SET_JOB_NAME", jobName: event.target.value })}
                      placeholder={`${PRODUCT_PROFILES[state.productType].label} proof`}
                      value={state.jobName}
                    />
                  </label>
                </div>
                <p className="text-[10px] font-semibold leading-4 text-muted">
                  Saved designs use this label so print shops can separate customer jobs.
                </p>
              </div>

              {/* Save Design */}
              <button
                className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border-2 border-accent/30 bg-accent/5 px-4 text-sm font-semibold text-accent transition hover:bg-accent/10 disabled:opacity-50"
                disabled={state.isSaving}
                onClick={handleSaveDesign}
              >
                {state.isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {state.currentDesignId ? "Update saved design" : "Save design to account"}
              </button>
              {state.saveMessage ? (
                <div className="rounded-[6px] bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent">{state.saveMessage}</div>
              ) : null}

              {/* My Designs */}
              {state.savedDesigns.length > 0 ? (
                <div className="rounded-[8px] border border-border bg-surface p-2.5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-muted" />
                    <h3 className="font-display text-sm font-semibold text-surface-ink">My Designs</h3>
                    <span className="text-[10px] text-muted">({state.savedDesigns.length})</span>
                  </div>
                  <div className="max-h-[180px] overflow-auto space-y-1">
                    {state.savedDesigns.map((design) => (
                      <div
                        key={design.id}
                        className={`flex items-center gap-2 rounded-[6px] px-2 py-1.5 text-xs transition cursor-pointer ${
                          state.currentDesignId === design.id
                            ? "bg-accent/10 border border-accent/20"
                            : "hover:bg-surface-strong border border-transparent"
                        }`}
                      >
                        <button
                          className="flex-1 text-left min-w-0"
                          onClick={() => handleLoadDesign(design.id)}
                        >
                          <div className="truncate font-semibold text-surface-ink">{design.clientName || design.name}</div>
                          <div className="truncate text-[10px] font-semibold text-muted">
                            {design.jobName || PRODUCT_PROFILES[design.productType as ProductType]?.label || design.productType}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2">
                            <span className="text-[10px] text-muted">{PRODUCT_PROFILES[design.productType as ProductType]?.label || design.productType}</span>
                            <Clock className="h-2.5 w-2.5 text-muted/50" />
                            <span className="text-[10px] text-muted/60">{new Date(design.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </button>
                        <button
                          className="shrink-0 rounded-[4px] p-1 text-muted/40 hover:bg-danger/10 hover:text-danger"
                          onClick={(e) => { e.stopPropagation(); handleDeleteDesign(design.id); }}
                          title="Delete design"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : state.isLoadingDesigns ? (
                <div className="rounded-[8px] border border-border bg-surface p-3 text-center text-xs text-muted">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin mb-1" />
                  Loading designs...
                </div>
              ) : null}

              {/* Billing */}
              <div className="rounded-[8px] border border-border bg-surface p-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  <WalletCards className="h-4 w-4 text-brand" />
                  <h3 className="font-display text-sm font-semibold text-surface-ink">Billing</h3>
                </div>
                <div className="text-xs font-semibold text-surface-ink">{accountEmail}</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className="h-8 rounded-[8px] border border-brand/30 bg-brand-soft text-xs font-semibold text-brand transition hover:bg-brand/10 disabled:opacity-50"
                    disabled={!!state.checkoutPending}
                    onClick={() => startCheckout("payment")}
                  >
                    {state.checkoutPending === "payment" ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : "Buy credit"}
                  </button>
                  <button
                    className="h-8 rounded-[8px] border border-surface-ink/20 bg-surface-ink text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                    disabled={!!state.checkoutPending}
                    onClick={() => startCheckout("subscription")}
                  >
                    {state.checkoutPending === "subscription" ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : "Start Pro"}
                  </button>
                </div>
                <button
                  className="h-8 w-full rounded-[8px] border border-border bg-surface text-xs font-semibold text-muted transition hover:text-surface-ink disabled:opacity-50"
                  disabled={state.accessPending}
                  onClick={sendAccessLink}
                >
                  {state.accessPending ? <Loader2 className="mr-2 inline h-3 w-3 animate-spin" /> : <Mail className="mr-1.5 inline h-3 w-3" />}
                  Send access link
                </button>
                {state.accessMessage ? (
                  <div className="rounded-[6px] bg-brand-soft px-2 py-1.5 text-[10px] font-semibold text-brand">{state.accessMessage}</div>
                ) : null}
                {state.paidSession?.entitlement === "subscription" ? (
                  <button
                    className="h-8 w-full rounded-[8px] border border-border bg-surface text-xs font-semibold text-muted transition hover:text-surface-ink disabled:opacity-50"
                    disabled={state.portalPending}
                    onClick={manageSubscription}
                  >
                    {state.portalPending ? <Loader2 className="mr-2 inline h-3 w-3 animate-spin" /> : <Settings className="mr-1.5 inline h-3 w-3" />}
                    Manage subscription
                  </button>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
