/**
 * Script: Analyze Operator Data Quality
 * 
 * Checks all operators for missing/empty fields and generates a report
 * 
 * Usage: node scripts/analyze-operator-data.js
 */

const { initializeApp, cert, getApps } = require('firebase-admin/app')
const { getDatabase } = require('firebase-admin/database')
const path = require('path')
const fs = require('fs')

// Initialize Firebase Admin
const serviceAccountPath = path.resolve(__dirname, '../firebase-service-account.json')

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccountPath),
    databaseURL: 'https://benxe-management-20251218-default-rtdb.asia-southeast1.firebasedatabase.app'
  })
}

const db = getDatabase()

const REQUIRED_FIELDS = ['name', 'code']
const IMPORTANT_FIELDS = [
  'tax_code',
  'phone', 
  'email',
  'address',
  'province',
  'representative_name'
]
const OPTIONAL_FIELDS = [
  'district',
  'representative_position',
  'is_ticket_delegated'
]

const ALL_FIELDS = [...REQUIRED_FIELDS, ...IMPORTANT_FIELDS, ...OPTIONAL_FIELDS]

function isFieldEmpty(value) {
  if (value === undefined || value === null) return true
  if (typeof value === 'string' && value.trim() === '') return true
  return false
}

async function analyzeOperators() {
  console.log('🔍 Fetching operators from Firebase RTDB...\n')
  
  const snapshot = await db.ref('operators').once('value')
  const data = snapshot.val() || {}
  
  const operators = Object.entries(data).map(([id, op]) => ({
    ...op,
    id
  }))
  
  console.log(`📊 Found ${operators.length} operators\n`)
  
  // Initialize field analysis
  const fieldAnalysis = {}
  ALL_FIELDS.forEach(field => {
    fieldAnalysis[field] = { filled: 0, empty: 0, fillRate: 0 }
  })
  
  // Analyze each operator
  const operatorDetails = []
  let completeOperators = 0
  
  for (const op of operators) {
    const missingFields = []
    let filledCount = 0
    
    for (const field of ALL_FIELDS) {
      const value = op[field]
      if (isFieldEmpty(value)) {
        fieldAnalysis[field].empty++
        missingFields.push(field)
      } else {
        fieldAnalysis[field].filled++
        filledCount++
      }
    }
    
    const completionScore = Math.round((filledCount / ALL_FIELDS.length) * 100)
    
    // Only count as complete if all important fields are filled
    const hasAllImportant = IMPORTANT_FIELDS.every(f => !isFieldEmpty(op[f]))
    if (hasAllImportant) completeOperators++
    
    operatorDetails.push({
      id: op.id,
      name: op.name || 'N/A',
      code: op.code || 'N/A',
      missingFields,
      completionScore
    })
  }
  
  // Calculate fill rates
  for (const field of ALL_FIELDS) {
    const total = fieldAnalysis[field].filled + fieldAnalysis[field].empty
    fieldAnalysis[field].fillRate = total > 0 
      ? Math.round((fieldAnalysis[field].filled / total) * 100)
      : 0
  }
  
  // Sort by completion score (worst first)
  operatorDetails.sort((a, b) => a.completionScore - b.completionScore)
  
  return {
    totalOperators: operators.length,
    completeOperators,
    incompleteOperators: operators.length - completeOperators,
    completionRate: operators.length > 0 ? Math.round((completeOperators / operators.length) * 100) : 0,
    fieldAnalysis,
    operatorDetails
  }
}

function generateReport(report) {
  let output = `# Operator Data Quality Report

Generated: ${new Date().toISOString()}

## Summary

| Metric | Value |
|--------|-------|
| Total Operators | ${report.totalOperators} |
| Complete (all important fields) | ${report.completeOperators} |
| Incomplete | ${report.incompleteOperators} |
| Completion Rate | ${report.completionRate}% |

## Field Analysis

| Field | Filled | Empty | Fill Rate |
|-------|--------|-------|-----------|
`

  for (const [field, stats] of Object.entries(report.fieldAnalysis)) {
    const indicator = stats.fillRate < 50 ? '⚠️' : stats.fillRate < 80 ? '🟡' : '✅'
    output += `| ${indicator} ${field} | ${stats.filled} | ${stats.empty} | ${stats.fillRate}% |\n`
  }

  output += `\n## Operators Needing Attention (sorted by completion)\n\n`
  
  const needsAttention = report.operatorDetails.filter(op => op.completionScore < 80)
  
  if (needsAttention.length === 0) {
    output += `✅ All operators have good data quality!\n`
  } else {
    output += `| Operator | Code | Completion | Missing Fields |\n`
    output += `|----------|------|------------|----------------|\n`
    
    for (const op of needsAttention.slice(0, 20)) {
      const missing = op.missingFields.length > 3 
        ? `${op.missingFields.slice(0, 3).join(', ')}... (+${op.missingFields.length - 3})`
        : op.missingFields.join(', ')
      output += `| ${op.name} | ${op.code} | ${op.completionScore}% | ${missing} |\n`
    }
    
    if (needsAttention.length > 20) {
      output += `\n... and ${needsAttention.length - 20} more operators need attention\n`
    }
  }

  output += `\n## Recommendations

### Immediate Actions
1. **Add validation** - Require important fields when creating new operators
2. **UI improvements** - Hide empty fields or show "Chưa cập nhật" instead of N/A
3. **Data cleanup** - Contact operators to update missing information

### Suggested Field Requirements

**Required (must have):**
- name, code

**Important (should have):**
- tax_code, phone, email, address, province, representative_name

**Optional:**
- district, representative_position, is_ticket_delegated
`

  return output
}

async function main() {
  try {
    const report = await analyzeOperators()
    const markdown = generateReport(report)
    
    // Print to console
    console.log(markdown)
    
    // Save to file
    const outputPath = path.resolve(__dirname, '../../docs/operator-data-quality-report.md')
    fs.writeFileSync(outputPath, markdown, 'utf-8')
    console.log(`\n📁 Report saved to: ${outputPath}`)
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()
