import type { EditableCheatSheet } from '../types';

export function printCheatSheet(sheet: EditableCheatSheet) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export the Production Recipe PDF.');
    return;
  }

  const chordsHtml = sheet.chordFormula && sheet.chordFormula.length > 0
    ? sheet.chordFormula.map(c => `<span class="chord-tag">${c}</span>`).join('')
    : '<span style="color:#777">No specific chords assigned</span>';

  const instrumentsHtml = sheet.overallInstrumentation && sheet.overallInstrumentation.length > 0
    ? sheet.overallInstrumentation.map(inst => `<span class="inst-pill">${inst}</span>`).join('')
    : '<span>General Hybrid Palette</span>';

  const sectionsRows = (sheet.sectionsBreakdown || []).map((sec, i) => `
    <tr>
      <td style="font-weight: 700; color: #111;">
        <div style="font-size: 13px;">${i + 1}. ${sec.sectionName}</div>
        <div style="font-family: monospace; font-size: 11px; color: #555; margin-top: 2px;">
          ${sec.timeWindow} (${sec.durationSec}s • ~${sec.barCount} bars)
        </div>
      </td>
      <td>
        <div style="font-size: 12px; margin-bottom: 4px;">
          ${(sec.instrumentsUsed || []).map(inst => `<span class="table-pill">${inst}</span>`).join(' ') || '<em style="color:#888;">Full Palette</em>'}
        </div>
        <div style="font-size: 12px; color: #222; font-weight: 500; line-height: 1.4;">
          <strong>Roles & Techniques:</strong> ${sec.instrumentActions || 'Unspecified'}
        </div>
      </td>
      <td style="font-size: 12px; color: #333; line-height: 1.4;">
        ${sec.feelAndArrangement || 'Arrangement progression.'}
      </td>
    </tr>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${sheet.genre} // Production Recipe</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 16mm 14mm 16mm 14mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
            color: #111;
            background: #fff;
            margin: 0;
            padding: 10px;
            font-size: 12px;
            line-height: 1.5;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #000;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          h1 {
            font-size: 24px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0 0 4px 0;
            color: #000;
          }
          .subtitle {
            font-size: 12px;
            color: #555;
            font-family: monospace;
          }
          .print-btn {
            background: #000;
            color: #fff;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 700;
            cursor: pointer;
            font-size: 11px;
            text-transform: uppercase;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 18px;
          }
          .metric-card {
            border: 1px solid #d4d4d8;
            background: #fafafa;
            padding: 10px 12px;
            border-radius: 6px;
          }
          .metric-label {
            font-size: 9px;
            text-transform: uppercase;
            font-weight: 800;
            color: #666;
            margin-bottom: 3px;
            letter-spacing: 0.5px;
          }
          .metric-val {
            font-size: 16px;
            font-weight: 800;
            font-family: monospace;
            color: #000;
          }
          .section-block {
            margin-bottom: 16px;
          }
          h2 {
            font-size: 13px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1.5px solid #222;
            padding-bottom: 4px;
            margin: 16px 0 8px 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .chord-tag {
            display: inline-block;
            background: #111;
            color: #fff;
            font-family: monospace;
            font-weight: 700;
            font-size: 12px;
            padding: 3px 8px;
            border-radius: 4px;
            margin: 2px 4px 2px 0;
          }
          .inst-pill {
            display: inline-block;
            background: #f0f0f2;
            border: 1px solid #d8d8de;
            color: #222;
            font-size: 11px;
            padding: 2px 7px;
            border-radius: 4px;
            margin: 2px 4px 2px 0;
            font-weight: 500;
          }
          .table-pill {
            display: inline-block;
            background: #eef2ff;
            border: 1px solid #c7d2fe;
            color: #312e81;
            font-size: 10px;
            padding: 1px 6px;
            border-radius: 4px;
            font-weight: 600;
            margin-right: 2px;
            margin-bottom: 2px;
          }
          .text-box {
            background: #fafafc;
            border: 1px solid #e4e4e7;
            border-radius: 6px;
            padding: 10px 12px;
            font-size: 12px;
            line-height: 1.6;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }
          th, td {
            border: 1px solid #e4e4e7;
            padding: 8px 10px;
            text-align: left;
            vertical-align: top;
          }
          th {
            background: #f4f4f5;
            font-size: 10px;
            text-transform: uppercase;
            font-weight: 800;
            letter-spacing: 0.5px;
            color: #444;
          }
          .footer {
            margin-top: 24px;
            padding-top: 8px;
            border-top: 1px solid #ddd;
            font-size: 10px;
            font-family: monospace;
            color: #777;
            display: flex;
            justify-content: space-between;
          }
          @media print {
            body { padding: 0; }
            .print-btn { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>${sheet.genre} // Production Recipe</h1>
            <div class="subtitle">
              ${sheet.projectAlbumTitle ? `Assigned Brief: ${sheet.projectAlbumTitle} • ` : ''}Synthesized Reference Blueprint • Updated: ${sheet.lastUpdated}
            </div>
          </div>
          <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
        </div>

        <div class="summary-grid">
          <div class="metric-card">
            <div class="metric-label">BPM Range</div>
            <div class="metric-val">${sheet.bpmRange || `${sheet.avgBpm} BPM`}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Primary Keys</div>
            <div class="metric-val">${sheet.commonKeys || 'D min'}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Loudness Target</div>
            <div class="metric-val">${sheet.targetLufs} LUFS</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">True Peak Ceiling</div>
            <div class="metric-val">${sheet.truePeakTargetDb ?? -0.1} dBTP</div>
          </div>
        </div>

        <div class="section-block">
          <h2>1. Harmonic Language & Progression Recipe</h2>
          <div style="margin-bottom: 8px;">
            ${chordsHtml}
          </div>
          <div class="text-box">
            <strong>Harmonic Feel & Structure:</strong> ${sheet.harmonyTypes || 'Minor Aeolian, pedal-point foundations, and cinematic modal shifts.'}
          </div>
        </div>

        <div class="section-block">
          <h2>2. Track Feel & Dramatic Intent</h2>
          <div class="text-box">
            ${sheet.trackFeel || 'High-tension narrative arc designed for high-impact theatrical placement.'}
          </div>
        </div>

        <div class="section-block">
          <h2>3. Master Instrumentation Palette</h2>
          <div style="margin-bottom: 6px;">
            ${instrumentsHtml}
          </div>
        </div>

        <div class="section-block">
          <h2>4. Section-by-Section Arrangement Blueprint</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 26%;">Section & Timing</th>
                <th style="width: 44%;">Instruments & Performance Techniques</th>
                <th style="width: 30%;">Arrangement & Dynamic Intent</th>
              </tr>
            </thead>
            <tbody>
              ${sectionsRows}
            </tbody>
          </table>
        </div>

        <div class="section-block">
          <h2>5. Production & Mix Engineering Formula</h2>
          <div class="text-box">
            ${sheet.productionMixTips || 'Sidechain heavy sub-bass braams to allow trailer hits punch through. Keep high-frequency string ostinatos wide in the stereo image.'}
          </div>
        </div>

        <div class="footer">
          <span>Composer Workflow Studio Hub • Reference Synthesis</span>
          <span>Sample Pool: ${sheet.referenceTrackCount} Analyzed Cues</span>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}