/**
 * SIEM / threat-correlation enrichment for helix.hole events.
 *
 * Honest scope (D3): Helix does not scan CVEs, does not query NVD/OSV/EPSS,
 * and does not assign a CVE id to a hole. Enrichment only labels the DNA hole
 * so a SIEM can JOIN it to vulnerability / threat feeds the operator already runs.
 */

/** @typedef {{ family: string, class: string, mitre_attack: string[], siem_lookups: string[], cve_join: string }} HoleTaxonomy */

/** @type {Record<string, HoleTaxonomy>} */
const BY_CODE = {
  'HX-NO-DNA': {
    family: 'ops',
    class: 'missing_certificate',
    mitre_attack: [],
    siem_lookups: ['misconfiguration', 'deploy_gap'],
    cve_join: 'none — certificate not loaded; fix ops before threat join',
  },
  'HX-ROUTE-UNKNOWN': {
    family: 'unauthorized_surface',
    class: 'unknown_route',
    mitre_attack: ['T1190', 'T1505.003', 'T1100'],
    siem_lookups: ['web_shell', 'backdoor_route', 'rogue_admin', 'supply_chain_implant'],
    cve_join:
      'Join SIEM vuln findings (NVD/OSV/scanner) for the same host/app in the soak window; Helix proves the surface was not certified — it does not name a CVE',
  },
  'HX-SCHEMA-DRIFT': {
    family: 'shape_drift',
    class: 'response_json_keys',
    mitre_attack: ['T1190', 'T1078'],
    siem_lookups: ['api_contract_break', 'data_exfil_field', 'authz_bypass_payload'],
    cve_join: 'Correlate with API/WAF findings and recent deploys; optional CVE join on the upstream package if your SBOM feed ties the route to a component',
  },
  'HX-REQUEST-SCHEMA-DRIFT': {
    family: 'shape_drift',
    class: 'request_json_keys',
    mitre_attack: ['T1190', 'T1059'],
    siem_lookups: ['parameter_pollution', 'injection_probe', 'auth_bypass_field'],
    cve_join: 'Join request-anomaly / WAF signatures on same path; CVE only if your scanner already flagged the handler',
  },
  'HX-QUERY-SCHEMA-DRIFT': {
    family: 'shape_drift',
    class: 'query_names',
    mitre_attack: ['T1190', 'T1059.007'],
    siem_lookups: ['debug_query', 'sqli_probe', 'unexpected_param'],
    cve_join: 'Common join: same URL + vuln scanner findings for query-injection classes (not assigned by Helix)',
  },
  'HX-STATUS-DRIFT': {
    family: 'shape_drift',
    class: 'status_class',
    mitre_attack: ['T1499'],
    siem_lookups: ['error_surge', 'fail_open', 'upstream_compromise'],
    cve_join: 'Join availability / error dashboards; CVE join only via affected component inventory',
  },
  'HX-CONTENT-CLASS-DRIFT': {
    family: 'shape_drift',
    class: 'content_type',
    mitre_attack: ['T1105', 'T1505.003'],
    siem_lookups: ['payload_swap', 'webshell_upload', 'content_type_confusion'],
    cve_join: 'Join file/WAF malware hits on same path; Helix only saw content-class change vs DNA',
  },
  'HX-COOKIE-DRIFT': {
    family: 'session_surface',
    class: 'set_cookie_names',
    mitre_attack: ['T1550.004', 'T1078'],
    siem_lookups: ['session_fixation', 'auth_cookie_mint', 'sso_drift'],
    cve_join: 'Join IdP / session anomalies; CVE join via auth library SBOM if present',
  },
  'HX-REDIRECT-DRIFT': {
    family: 'session_surface',
    class: 'redirect_host',
    mitre_attack: ['T1557', 'T1185'],
    siem_lookups: ['open_redirect', 'phishing_bounce', 'sso_hijack'],
    cve_join: 'Join open-redirect / phishing intel on redirect host; Helix records host only never tokens',
  },
  'HX-BODY-TOO-LARGE': {
    family: 'ops',
    class: 'body_limit',
    mitre_attack: ['T1498'],
    siem_lookups: ['dos_probe', 'oversized_upload'],
    cve_join: 'Usually ops policy; join DoS/vuln findings only if scanners flag the same endpoint',
  },
};

const DEFAULT_TAXONOMY = {
  family: 'identity_mismatch',
  class: 'other',
  mitre_attack: ['T1190'],
  siem_lookups: ['dna_hole'],
  cve_join: 'Helix does not assign CVEs — correlate host/app/time with your vuln + threat feeds',
};

/**
 * @param {string} code
 * @returns {HoleTaxonomy}
 */
export function taxonomyForHoleCode(code) {
  return BY_CODE[code] || DEFAULT_TAXONOMY;
}

/**
 * Enrich a helix.hole event for SIEM / threat-intel join (additive; never invents CVE ids).
 * @param {object} event
 * @returns {object}
 */
export function enrichSiemHoleEvent(event) {
  const code = event?.hole?.code || 'HX-HOLE';
  const tax = taxonomyForHoleCode(code);
  const high = event?.severity === 'high';
  return {
    schema_version: 'helix.siem.v1',
    ...event,
    taxonomy: {
      family: tax.family,
      class: tax.class,
      hole_code: code,
    },
    threat_correlation: {
      // Helix is identity firewall, not a vuln scanner (D3).
      assigns_cve: false,
      queries_nvd: false,
      mitre_attack: tax.mitre_attack,
      siem_lookups: tax.siem_lookups,
      cve_join_guidance: tax.cve_join,
      priority_hint: high ? 'credential_surface' : 'standard',
      join_keys: {
        host: event.host || null,
        method: event.method || null,
        path: event.path || null,
        at: event.at || null,
        app_hint: 'use DNA app_id / asset tag in your CMDB join',
      },
    },
    observability: {
      log_stream: 'SIEM_LOG',
      companion_streams: ['OBSERVE', 'SHADOW_LOG'],
      docs: 'docs/LOGGING.md',
    },
  };
}

export const SIEM_SCHEMA_VERSION = 'helix.siem.v1';
export const HOLE_TAXONOMY = BY_CODE;
