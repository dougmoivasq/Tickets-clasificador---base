/**
 * Clasificador de Tickets de Soporte con IA (Claude API)
 * Lee tickets en Google Sheets y los clasifica automáticamente:
 * categoría, prioridad, sentimiento, resumen y respuesta sugerida.
 */
const MODELO = 'claude-sonnet-5-5';
const COLS = ['ID','Fecha','Cliente','Mensaje','Categoría','Prioridad','Sentimiento','Resumen','Respuesta sugerida','Estado'];
const CATEGORIAS = ['Facturación','Soporte técnico','Conectividad','Cuenta','Otro'];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('🤖 IA Tickets')
    .addItem('1. Configurar API Key', 'configurarApiKey')
    .addItem('2. Crear hoja de ejemplo', 'crearEjemplo')
    .addItem('3. Clasificar pendientes', 'clasificarPendientes')
    .addItem('4. Ver resumen', 'crearResumen')
    .addToUi();
}

/** Guarda la API key en las propiedades del script (nunca en el código) */
function configurarApiKey() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Pega tu API key de Anthropic:');
  if (r.getSelectedButton() === ui.Button.OK) {
    PropertiesService.getScriptProperties().setProperty('ANTHROPIC_API_KEY', r.getResponseText().trim());
    ui.alert('✅ API key guardada');
  }
}

function crearEjemplo() {
  const ss = SpreadsheetApp.getActive();
  const h = ss.getSheetByName('Tickets') || ss.insertSheet('Tickets');
  h.clear();
  h.appendRow(COLS);
  h.getRange(1,1,1,COLS.length).setFontWeight('bold').setBackground('#4c1d95').setFontColor('white');
  const hoy = new Date();
  [
    ['Ana Pérez','Me cobraron dos veces la factura de octubre, necesito el reembolso urgente.'],
    ['Luis Gómez','Desde ayer no tengo internet en mi casa, ya reinicié el router y nada.'],
    ['María Rojas','¿Cómo cambio el correo asociado a mi cuenta?'],
    ['Carlos Díaz','Llevo 3 días sin servicio y nadie me responde. Si no lo resuelven me cambio de proveedor.'],
    ['Sofía León','Gracias, el técnico fue muy amable y resolvió todo rápido.']
  ].forEach((t,i) => h.appendRow([`T-${String(i+1).padStart(3,'0')}`, hoy, t[0], t[1], '','','','','','Pendiente']));
  h.setColumnWidth(4, 350); h.setColumnWidth(9, 350); h.setFrozenRows(1);
}

/** Llama a Claude y devuelve un objeto JSON con la clasificación */
function clasificarConClaude_(mensaje) {
  const key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!key) throw new Error('Configura primero la API key (menú IA Tickets → 1)');

  const prompt = `Eres un analista de soporte al cliente. Clasifica el siguiente ticket.
Responde SOLO con un JSON válido, sin texto adicional, con este formato:
{"categoria": uno de ${JSON.stringify(CATEGORIAS)},
 "prioridad": "Alta" | "Media" | "Baja",
 "sentimiento": "Positivo" | "Neutral" | "Negativo",
 "resumen": "máximo 12 palabras",
 "respuesta": "respuesta breve, empática y profesional al cliente"}

Ticket: """${mensaje}"""`;

  const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({ model: MODELO, max_tokens: 500, messages: [{ role: 'user', content: prompt }] }),
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) throw new Error('Error API: ' + res.getContentText());

  const texto = JSON.parse(res.getContentText()).content[0].text;
  return JSON.parse(texto.slice(texto.indexOf('{'), texto.lastIndexOf('}') + 1));
}

function clasificarPendientes() {
  const h = SpreadsheetApp.getActive().getSheetByName('Tickets');
  const datos = h.getDataRange().getValues();
  let n = 0;
  for (let i = 1; i < datos.length; i++) {
    if (datos[i][9] !== 'Pendiente' || !datos[i][3]) continue;
    try {
      const r = clasificarConClaude_(datos[i][3]);
      h.getRange(i+1, 5, 1, 6).setValues([[r.categoria, r.prioridad, r.sentimiento, r.resumen, r.respuesta, 'Clasificado']]);
      const color = { Alta:'#fecaca', Media:'#fef08a', Baja:'#bbf7d0' }[r.prioridad];
      h.getRange(i+1, 6).setBackground(color || null);
      n++;
    } catch (e) {
      h.getRange(i+1, 10).setValue('Error: ' + e.message.slice(0, 80));
    }
    SpreadsheetApp.flush();
  }
  SpreadsheetApp.getActive().toast(`${n} tickets clasificados`, '🤖 IA');
}

/** Hoja de resumen con fórmulas y gráfico */
function crearResumen() {
  const ss = SpreadsheetApp.getActive();
  const h = ss.getSheetByName('Resumen') || ss.insertSheet('Resumen');
  h.clear(); h.getCharts().forEach(c => h.removeChart(c));
  h.getRange('A1:B1').setValues([['Categoría','Tickets']]).setFontWeight('bold');
  CATEGORIAS.forEach((c,i) => h.getRange(i+2,1,1,2).setValues([[c, `=COUNTIF(Tickets!E:E,"${c}")`]]));
  h.getRange('D1:E1').setValues([['Prioridad','Tickets']]).setFontWeight('bold');
  ['Alta','Media','Baja'].forEach((p,i) => h.getRange(i+2,4,1,2).setValues([[p, `=COUNTIF(Tickets!F:F,"${p}")`]]));
  h.insertChart(h.newChart().setChartType(Charts.ChartType.PIE)
    .addRange(h.getRange('A1:B6')).setPosition(8,1,0,0)
    .setOption('title','Tickets por categoría').build());
}
