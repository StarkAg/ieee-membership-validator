# Error Flow Documentation

This document shows how errors are handled throughout the IEEE Membership Validator application.

## Error Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (app/page.tsx)                      │
│                    handleValidate() Function                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │  Pre-Validation Checks               │
        └─────────────────────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
        ▼                                           ▼
┌───────────────┐                          ┌───────────────┐
│ Countdown > 0 │                          │ No Countdown │
│               │                          │ & No Message │
└───────────────┘                          └───────────────┘
        │                                           │
        ▼                                           ▼
   ⏳ Message:                              ⚠️ Message:
   "Please wait for                          "Please click
   validator to finish"                      Fire Up Validator"
        │                                           │
        └───────────────────┬───────────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │ Empty Membership IDs? │
                └───────────────────────┘
                            │
                            ▼
                    ⚠️ Message:
                    "Please enter at
                    least 1 membership
                    number"
                            │
                            ▼
        ┌───────────────────────────────────┐
        │  API Call: POST /api/validate      │
        └───────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│              API ROUTE (app/api/validate/route.ts)            │
│                    POST Handler                               │
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────┐
        │  HTTP Response Status Check        │
        └───────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
┌───────────────┐                      ┌───────────────┐
│ Status = 404  │                      │ Status = 200  │
└───────────────┘                      └───────────────┘
        │                                       │
        ▼                                       ▼
⚠️ Frontend:                            ┌───────────────────┐
"Please click Fire                      │ Process Results   │
Up Validator API"                       └───────────────────┘
        │                                       │
        └───────────────────┬───────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────┐
        │  validateMember() for each ID      │
        │  (IEEEMembershipValidator class)   │
        └───────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────┐
        │  Axios POST to IEEE Service         │
        └───────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
┌───────────────┐                      ┌───────────────┐
│   SUCCESS     │                      │    ERROR      │
│   (200 OK)    │                      │   (Catch)     │
└───────────────┘                      └───────────────┘
        │                                       │
        ▼                                       ▼
┌───────────────┐              ┌───────────────────────────┐
│ Parse HTML    │              │ Error Type Detection     │
│ with Cheerio  │              └───────────────────────────┘
└───────────────┘                            │
        │                                     │
        ▼                          ┌──────────┴──────────┐
┌───────────────┐                  │                     │
│ Check Session │                  ▼                     ▼
│ Expiry        │          ┌──────────────┐    ┌──────────────┐
└───────────────┘          │ 404 Not Found│    │ 401/403 Error│
        │                  └──────────────┘    └──────────────┘
        │                            │                  │
        ▼                            ▼                  ▼
┌───────────────┐          Return Error:        Return Error:
│ Return Result │          "404 Not Found -      "Session expired:
│ with Data     │          Please click Fire     401/403..."
│               │          Up Validator API"      │
└───────────────┘                            │
                                              ▼
                                    ┌──────────────────┐
                                    │ Trigger GitHub   │
                                    │ Actions Workflow │
                                    │ (if 401 & config)│
                                    └──────────────────┘
                                              │
                                              ▼
                                    Return: refreshTriggered = true
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│              FRONTEND (app/page.tsx)                          │
│              Process API Response                             │
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────┐
        │  Check Results for Errors          │
        └───────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
┌───────────────┐                      ┌───────────────┐
│ 404 Error     │                      │ 401/403 Error │
│ Detected      │                      │ Detected      │
└───────────────┘                      └───────────────┘
        │                                       │
        ▼                                       ▼
⚠️ Message:                            ┌──────────────────┐
"Please click Fire                     │ Refresh Triggered?│
Up Validator API"                      └──────────────────┘
        │                                       │
        │                              ┌────────┴────────┐
        │                              │                 │
        │                              ▼                 ▼
        │                      🔄 Message:        ⚠️ Message:
        │                      "Session expired.  "Session expired.
        │                      Auto-refresh      Please click Fire
        │                      triggered..."    Up Validator API"
        │                              │                 │
        │                              ▼                 ▼
        │                      Set Countdown:    Unlock Cookie
        │                      90 seconds        Input
        │                              │                 │
        └──────────────────────────────┴─────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  Catch Block  │
                    │  (if thrown)  │
                    └───────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Check Error   │
                    │ Message       │
                    └───────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
┌───────────────┐                      ┌───────────────┐
│ Contains 404  │                      │ Contains      │
│ or "Not Found"│                      │ Session/401/403│
└───────────────┘                      └───────────────┘
        │                                       │
        ▼                                       ▼
⚠️ Message:                            ⚠️ Message:
"Please click Fire                     "Please click Fire
Up Validator API"                      Up Validator API
                                      to refresh session"
                            │
                            ▼
                    ┌───────────────┐
                    │ Display Error │
                    │ in UI         │
                    └───────────────┘
```

## Error Types and Messages

### 1. Pre-Validation Errors (Frontend Only)

| Condition | Error Message | Location |
|-----------|--------------|----------|
| Countdown active (> 0) | `⏳ Please wait for the validator to finish starting up. Click "Fire Up Validator API" if you haven't already.` | `page.tsx:45` |
| No countdown & no message | `⚠️ Please click "Fire Up Validator API" before validating.` | `page.tsx:50` |
| Empty membership IDs | `⚠️ Please enter at least 1 membership number.` | `page.tsx:55, 66` |

### 2. HTTP Response Errors (Frontend)

| Status Code | Error Message | Location |
|-------------|--------------|----------|
| 404 | `⚠️ Please click "Fire Up Validator API" before validating.` | `page.tsx:97` |
| Other non-200 | Throws error, caught in catch block | `page.tsx:102` |

### 3. API Route Validation Errors

| Error Type | HTTP Status | Error Message | Location |
|------------|-------------|--------------|----------|
| Missing cookie | 400 | `Cookie is required` | `route.ts:314` |
| Missing membership IDs | 400 | `Membership IDs are required` | `route.ts:318` |

### 4. IEEE Service Errors (Backend)

| Error Type | Error Message in Result | Location |
|------------|------------------------|----------|
| 404 Not Found | `404 Not Found - Please click "Fire Up Validator API" before validating` | `route.ts:261` |
| 401 Unauthorized | `Session expired: 401 Unauthorized - Cookie is invalid or expired` | `route.ts:274` |
| 403 Forbidden | `Access denied: 403 Forbidden - Cookie may be invalid` | `route.ts:287` |
| Session Expired (HTML check) | `Session expired: Membership validation status section not found` | `route.ts:238` |
| Other errors | `Error: {error.message}` | `route.ts:298` |

### 5. Result Processing Errors (Frontend)

| Error Detected | Action | Message | Location |
|----------------|--------|---------|----------|
| 404 in results | Break loop | `⚠️ Please click "Fire Up Validator API" before validating.` | `page.tsx:113` |
| 401/403 in results | Break loop, check refresh | `🔄 Session expired. Cookie refresh workflow has been automatically triggered.` OR `⚠️ Session expired. Please click "Fire Up Validator API" to refresh.` | `page.tsx:122-129` |

### 6. Catch Block Errors (Frontend)

| Error Contains | Message | Location |
|----------------|---------|----------|
| "404" or "Not Found" | `⚠️ Please click "Fire Up Validator API" before validating.` | `page.tsx:152` |
| "Session", "Cookie", "401", or "403" | `⚠️ Please click "Fire Up Validator API" to refresh the session.` | `page.tsx:155` |

## Auto-Refresh Flow (401 Errors)

```
401 Error Detected
        │
        ▼
Check GITHUB_TOKEN & GITHUB_REPO
        │
        ├─── Not Set ────► Log Warning (No Action)
        │
        └─── Set ────► Trigger GitHub Actions Workflow
                        │
                        ▼
                POST to GitHub API
                /repos/{owner}/{repo}/actions/workflows/refresh-cookie.yml/dispatches
                        │
                        ├─── Success ────► refreshTriggered = true
                        │
                        └─── Failure ────► Log Error (Continue)
                        │
                        ▼
                Return to Frontend with refreshTriggered flag
                        │
                        ▼
                Frontend shows: "🔄 Session expired. Cookie refresh workflow has been automatically triggered."
                + Restart countdown (90 seconds)
```

## Error Display Location

All error messages are displayed in the **refresh message area** (the colored message box below the "Fire Up Validator API" button):

- ✅ Green box: Success messages
- ⏳ Yellow box: Waiting/in-progress messages  
- ⚠️ Orange box: Warning/error messages
- 🔄 Yellow/Green box: Auto-refresh messages

## Key Files

- **Frontend Error Handling**: `web-app/app/page.tsx` (lines 42-159)
- **API Route Error Handling**: `web-app/app/api/validate/route.ts` (lines 209-409)
- **Validation Class**: `web-app/app/api/validate/route.ts` (IEEEMembershipValidator class)

