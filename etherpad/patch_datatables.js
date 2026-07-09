const fs = require("fs");

// 1. Patch datatables.js (unsettled hook function error and SAFE Spacebar key interception with native API)
const file1 = "/opt/etherpad-lite/src/node_modules/ep_tables4/static/js/datatables.js";
if (fs.existsSync(file1)) {
  let content = fs.readFileSync(file1, "utf8");
  const lineEnding = content.includes("\r\n") ? "\r\n" : "\n";
  content = content.replace("if (node.innerHTML.indexOf(\"data-tables\") == -1) return;", "if (node.innerHTML.indexOf(\"data-tables\") == -1) return cb();");
  content = content.replace("if (node.innerHTML.indexOf(\"<tbody>\") != -1) return;", "if (node.innerHTML.indexOf(\"<tbody>\") != -1) return cb();");
  content = content.replace("  // }\r\n}", "  // }\r\n  return cb();\r\n}");

  // Fix children safety check for Timeslider context
  content = content.replace("while(node.children.length == 1) {", "while(node.children && node.children.length == 1) {");
  content = content.replace("if (node.children.length > 0) {", "if (node.children && node.children.length > 0) {");

  // Fix rendering context in datatables.js to pass "timeslider" context dynamically
  content = content.replace(
    "    // RENDER NODE" + lineEnding +
    "    var dtAttrs = typeof (exports.Datatables) != 'undefined' ? exports.Datatables.attributes : null;" + lineEnding +
    "    dtAttrs = dtAttrs || \"\";" + lineEnding +
    "    DatatablesRenderer.render({}, node, dtAttrs);",
    "    // RENDER NODE" + lineEnding +
    "    var dtAttrs = typeof (exports.Datatables) != 'undefined' ? exports.Datatables.attributes : null;" + lineEnding +
    "    dtAttrs = dtAttrs || \"\";" + lineEnding +
    "    var isTimeslider = (typeof (timeslider) !== 'undefined' || (window.location && window.location.pathname && window.location.pathname.indexOf('/timeslider') !== -1));" + lineEnding +
    "    var renderingContext = isTimeslider ? \"timeslider\" : {};" + lineEnding +
    "    DatatablesRenderer.render(renderingContext, node, dtAttrs);"
  );

  const returnKeyBlockPattern = /Datatables\.doReturnKey\(\);\r?\n\s*specialHandled = true;\r?\n\s*\}/;
  const spacebarPatchCode = `Datatables.doReturnKey();
        specialHandled = true;
      }
      if ((!specialHandled) && type == "keydown" && (keyCode == 32 || evt.key == " " || evt.code == "Space" || evt.which == 32)) {
        context.editorInfo.ace_fastIncorp(5);
        evt.preventDefault();
        context.editorInfo.ace_performDocumentReplaceRange(context.rep.selStart, context.rep.selEnd, "\\u00A0");
        specialHandled = true;
      }`;
  const spacebarPatchCodeNormalized = spacebarPatchCode.replace(/\r?\n/g, lineEnding);
  content = content.replace(returnKeyBlockPattern, spacebarPatchCodeNormalized);

  // Disable table key events in read-only mode
  content = content.replace(
    /exports\.aceKeyEvent\s*=\s*function\s*\(hook,\s*context\)\s*\{\s*var\s*specialHandled\s*=\s*false;/,
    "exports.aceKeyEvent = function (hook, context) {" + lineEnding +
    "  if (window.clientVars && window.clientVars.readonly) return false;" + lineEnding +
    "  var specialHandled = false;"
  );

  fs.writeFileSync(file1, content, "utf8");
  console.log("Successfully patched datatables.js");
}

// 2. Patch datatables-renderer.js (render spaces as \u00A0 AND omit hidden JSON cells during HTML export)
const file2 = "/opt/etherpad-lite/src/node_modules/ep_tables4/static/js/datatables-renderer.js";
if (fs.existsSync(file2)) {
  let content = fs.readFileSync(file2, "utf8");
  const lineEnding = content.includes("\r\n") ? "\r\n" : "\n";
  
  // Replace space with \u00A0
  content = content.replace("tds[i] = this.setLinks(tds[i]);", "tds[i] = (tds[i] || \"\").replace(/ /g, \"\\u00A0\");" + lineEnding + "                        tds[i] = this.setLinks(tds[i]);");

  // Omit preHeader cell during export
  content = content.replace(
    "htmlTbl += \"<td class='regex-delete'  name='payload' class='hide-el overhead' style='display:none;'>\" + preHeader + \"</td>\";",
    "htmlTbl += (renderingContext == \"export\" ? \"\" : \"<td class='regex-delete'  name='payload' class='hide-el overhead' style='display:none;'>\" + preHeader + \"</td>\");"
  );

  // Omit delimCell during export
  content = content.replace(
    "var delimCell = \"<td class='regex-delete' name='delimCell' id='\" + \"' class='hide-el overhead' style='display:none;'>\" + quoteAndComma + \"</td>\";",
    "var delimCell = (renderingContext == \"export\" ? \"\" : \"<td class='regex-delete' name='delimCell' id='\" + \"' class='hide-el overhead' style='display:none;'>\" + quoteAndComma + \"</td>\");"
  );

  // Omit bracketAndcomma cell during export
  content = content.replace(
    "htmlTbl += \"<td class='regex-delete' name='bracketAndcomma' class=' hide-el overhead' style='display:none;'>\" + bracketAndcomma + \"</td>\";",
    "htmlTbl += (renderingContext == \"export\" ? \"\" : \"<td class='regex-delete' name='bracketAndcomma' class=' hide-el overhead' style='display:none;'>\" + bracketAndcomma + \"</td>\");"
  );

  // 2.1 Patch Table Tag Border and Width (to help LibreOffice recognize it as a bordered table spanning full width, and restrict borders/widths changes to export context)
  content = content.replace(
    "var htmlTbl = \"<table class='\" + tblClass + \"' style='\" + printViewTBlStyles + \"background-color:white;width:\" + tblWidth + \"%!important;height:\" + tblHeight + \"px!important;'><tbody>\";",
    "var tableExtra = \"\";" + lineEnding +
    "                var tableBorders = \"\";" + lineEnding +
    "                if (tblBorderWidth > 0) {" + lineEnding +
    "                    tableBorders = \"border-left:\" + tblBorderWidth + \"px solid \" + tblBorderColor + \"!important;border-right:\" + tblBorderWidth + \"px solid \" + tblBorderColor + \"!important;\";" + lineEnding +
    "                }" + lineEnding +
    "                var widthStyle = \"\";" + lineEnding +
    "                if (tblWidth == \"100\") {" + lineEnding +
    "                    widthStyle = \"width:calc(100% - 2px)!important;margin-left:1px!important;\";" + lineEnding +
    "                } else {" + lineEnding +
    "                    widthStyle = \"width:\" + tblWidth + \"%!important;\";" + lineEnding +
    "                }" + lineEnding +
    "                if (renderingContext == \"export\") {" + lineEnding +
    "                    tableExtra = \" border='1' bordercolor='\" + tblBorderColor + \"' width='100%'\";" + lineEnding +
    "                    widthStyle = \"width:\" + tblWidth + \"%!important;\";" + lineEnding +
    "                }" + lineEnding +
    "                var htmlTbl = \"<table class='\" + tblClass + \"'\" + tableExtra + \" style='\" + printViewTBlStyles + tableBorders + widthStyle + \"background-color:white;height:\" + tblHeight + \"px!important;'><tbody>\";"
  );

  // 2.2 Patch TD styles to add explicit top/bottom border and width attributes in Export context
  content = content.replace(
    "var lastCellBorder = \"\";" + lineEnding +
    "                        if (i == tl - 1) {" + lineEnding +
    "                            delimCell = \"\";" + lineEnding +
    "                            lastCellBorder = \"border-right:\" + tblBorderWidth + \"px solid \" + tblBorderColor + \"!important;\";" + lineEnding +
    "                            quoteAndComma = \"\";" + lineEnding +
    "                        }",
    "var lastCellBorder = \"\";" + lineEnding +
    "                        if (i == tl - 1) {" + lineEnding +
    "                            delimCell = \"\";" + lineEnding +
    "                            lastCellBorder = \"border-right:\" + tblBorderWidth + \"px solid \" + tblBorderColor + \"!important;\";" + lineEnding +
    "                            quoteAndComma = \"\";" + lineEnding +
    "                        }" + lineEnding +
    "                        var exportHorizBorders = \"\";" + lineEnding +
    "                        var colWidthAttr = \"\";" + lineEnding +
    "                        if (renderingContext == \"export\") {" + lineEnding +
    "                            exportHorizBorders = \"border-bottom:\" + tblBorderWidth + \"px solid \" + tblBorderColor + \";\";" + lineEnding +
    "                            if (isFirstRow) {" + lineEnding +
    "                                exportHorizBorders += \"border-top:\" + tblBorderWidth + \"px solid \" + tblBorderColor + \";\";" + lineEnding +
    "                            }" + lineEnding +
    "                            if (typeof(colAttrs[i]) != \"undefined\" && colAttrs[i] != null && colAttrs[i].width) {" + lineEnding +
    "                                colWidthAttr = \" width='\" + colAttrs[i].width + \"'\";" + lineEnding +
    "                            }" + lineEnding +
    "                        }"
  );

  // Apply exportHorizBorders and colWidthAttr to first cell type (with break)
  content = content.replace(
    "htmlTbl += \"<td  name='tData' \" + colVAlign + \" style='\" + printViewTblTDStyles + cellStyles + \" border-left:\" + " + lineEnding +
    "                            tblBorderWidth + \"px solid \" + tblBorderColor + \";\" + borderTop + lastCellBorder + \"' >\"",
    "htmlTbl += \"<td  name='tData' \" + colVAlign + colWidthAttr + \" style='\" + printViewTblTDStyles + cellStyles + \" border-left:\" + " + lineEnding +
    "                            tblBorderWidth + \"px solid \" + tblBorderColor + \";\" + borderTop + lastCellBorder + exportHorizBorders + \"' >\""
  );

  // Apply exportHorizBorders and colWidthAttr to second cell type (without break)
  content = content.replace(
    "htmlTbl += \"<td name='tData' \" + colVAlign + \" style='\" + printViewTblTDStyles + cellStyles + lastCellBorder + \" border-left:\" + tblBorderWidth + \"px solid \" + tblBorderColor + \";\" + borderTop + \"' >\" + tds[i]",
    "htmlTbl += \"<td name='tData' \" + colVAlign + colWidthAttr + \" style='\" + printViewTblTDStyles + cellStyles + lastCellBorder + \" border-left:\" + tblBorderWidth + \"px solid \" + tblBorderColor + \";\" + borderTop + exportHorizBorders + \"' >\" + tds[i]"
  );

  // Pass totalCols (tl) and renderingContext to getCellAttrs
  content = content.replace(
    "var cellStyles = this.getCellAttrs(singleRowAttr, cellAttr, colAttrs[i], authors, i, j);",
    "var cellStyles = this.getCellAttrs(singleRowAttr, cellAttr, colAttrs[i], authors, i, j, tl, renderingContext);"
  );

  // Modify getCellAttrs signature and width logic to set default width as a percentage of total columns ONLY during export
  content = content.replace(
    "getCellAttrs: function (singleRowAttr, cellAttr, colAttr, authors, cell, row) {" + lineEnding +
    "                var attrsJSO = {};" + lineEnding +
    "                var colWidth = typeof (colAttr) == 'undefined' || colAttr == null ? \"\" : colAttr.width || \"\";" + lineEnding +
    "                attrsJSO['width'] = colWidth + 'px';",
    "getCellAttrs: function (singleRowAttr, cellAttr, colAttr, authors, cell, row, totalCols, renderingContext) {" + lineEnding +
    "                var attrsJSO = {};" + lineEnding +
    "                var colWidth = typeof (colAttr) == 'undefined' || colAttr == null ? \"\" : colAttr.width || \"\";" + lineEnding +
    "                if (colWidth) {" + lineEnding +
    "                    attrsJSO['width'] = colWidth + 'px';" + lineEnding +
    "                } else if (totalCols && renderingContext == \"export\") {" + lineEnding +
    "                    attrsJSO['width'] = (100 / totalCols) + '%';" + lineEnding +
    "                }"
  );

  // 2.3 Post-process the generated table HTML in Export context to strip "!important" (keeping table-layout: fixed)
  content = content.replace(
    "htmlTbl += \"</tbody></table>\";" + lineEnding +
    "                return htmlTbl;",
    "htmlTbl += \"</tbody></table>\";" + lineEnding +
    "                if (renderingContext == \"export\") {" + lineEnding +
    "                    htmlTbl = htmlTbl.replace(/ !important/g, \"\")" + lineEnding +
    "                                     .replace(/!important/g, \"\");" + lineEnding +
    "                }" + lineEnding +
    "                return htmlTbl;"
  );

  // 2.4 Patch the render function to support Timeslider context and handle authorship spans dynamically
  const renderPatchRegex = /element\.innerHTML\s*=\s*renderer\.getHtml\(element\.innerHTML,\s*attributes,\s*context\);\s*[\s\S]*?indexOf\("payload"\)\s*!=\s*2\)\s*\{\s*\/\/console\.log\("DO NOTHING"\);\s*\r?\n\s*return;\s*\}/;

  const replacementRenderFunc = [
    "if (context == \"timeslider\") {",
    "                    var regex1 = new RegExp('(^\\\\<span\\\\ class=[\\\\\\'\\\"]?[^\\\\>]*\\\\>)', 'i');",
    "                    var regex2 = new RegExp('(\\\\<\\\\/span\\\\>)$$', 'i');",
    "                    var code = renderer.htmlspecialchars_decode(element.innerHTML)",
    "                               .replace(regex1, '')",
    "                               .replace(regex2, '');",
    "                    element.innerHTML = renderer.getHtml(code, attributes, context);",
    "                    return;",
    "                }",
    "                element.innerHTML = renderer.getHtml(element.innerHTML, attributes, context);",
    "                if (element.innerHTML && element.innerHTML.indexOf(\"payload\") != 2) {",
    "                    return;",
    "                }"
  ].join(lineEnding);

  content = content.replace(renderPatchRegex, replacementRenderFunc);

  fs.writeFileSync(file2, content, "utf8");
  console.log("Successfully patched datatables-renderer.js");
}

// 3. Patch contentcollector.js (convert \u00A0 back to normal spaces during content collection)
const file3 = "/opt/etherpad-lite/src/node_modules/ep_tables4/static/js/contentcollector.js";
if (fs.existsSync(file3)) {
  let content = fs.readFileSync(file3, "utf8");
  const lineEnding = content.includes("\r\n") ? "\r\n" : "\n";
  content = content.replace("txt = txt.replace(/\\\\/g, \"|\");", "txt = txt.replace(/\\u00A0/g, \" \");" + lineEnding + "                    txt = txt.replace(/\\\\/g, \"|\");");
  fs.writeFileSync(file3, content, "utf8");
  console.log("Successfully patched contentcollector.js");
}

// 4. Patch export2html.js (make table attribute extraction robust to prevent fallback to raw JSON when attributes are missing from the line)
const file4 = "/opt/etherpad-lite/src/node_modules/ep_tables4/export2html.js";
if (fs.existsSync(file4)) {
  let content = fs.readFileSync(file4, "utf8");
  const lineEnding = content.includes("\r\n") ? "\r\n" : "\n";
  
  const targetText = [
    "exports.getLineHTMLForExport = function (hook, context) {",
    "  if (context.text.indexOf(\"data-tables\") != -1) {",
    "    var attribIndex = retrieveIndex(context.attribLine);",
    "    if (attribIndex) {",
    "      var dtAttrs = context.apool.numToAttrib[attribIndex][1];",
    "      context.lineContent = DatatablesRendererExport.DatatablesRenderer.render(\"export\", context, dtAttrs);",
    "    }",
    "  }",
    "  return true;",
    "};"
  ].join(lineEnding);

  const replacementText = [
    "exports.getLineHTMLForExport = function (hook, context) {",
    "  if (context.text.indexOf(\"data-tables\") != -1) {",
    "    var dtAttrs = \"\";",
    "    try {",
    "      var parsed = JSON.parse(context.text);",
    "      if (parsed && parsed.tblProperties) {",
    "        dtAttrs = JSON.stringify(parsed.tblProperties);",
    "      }",
    "    } catch (e) {}",
    "    if (!dtAttrs) {",
    "      try {",
    "        var attribIndex = retrieveIndex(context.attribLine);",
    "        if (attribIndex && context.apool.numToAttrib[attribIndex]) {",
          "          dtAttrs = context.apool.numToAttrib[attribIndex][1];",
    "        }",
    "      } catch (e) {}",
    "    }",
    "    context.lineContent = DatatablesRendererExport.DatatablesRenderer.render(\"export\", context, dtAttrs);",
    "  }",
    "  return true;",
    "};"
  ].join(lineEnding);

  if (content.includes(targetText)) {
    content = content.replace(targetText, replacementText);
  } else {
    // Try with normalized line endings just in case
    const targetTextLF = targetText.replace(/\r\n/g, "\n");
    const replacementTextLF = replacementText.replace(/\r\n/g, "\n");
    content = content.replace(targetTextLF, replacementTextLF);
  }

  fs.writeFileSync(file4, content, "utf8");
  console.log("Successfully patched export2html.js");
}

// 5. Patch ExportHtml.ts (merge consecutive tables with class 'data-tables' into a single HTML table)
const file5 = "/opt/etherpad-lite/src/node/utils/ExportHtml.ts";
if (fs.existsSync(file5)) {
  let content = fs.readFileSync(file5, "utf8");
  const lineEnding = content.includes("\r\n") ? "\r\n" : "\n";
  const targetText = "  return pieces.join('');" + lineEnding + "};";
  const replacementText = "  let result = pieces.join('');" + lineEnding +
                          "  result = result.replace(/<\\/tbody><\\/table>\\s*<br\\s*\\/?>\\s*<table class=['\"]data-tables['\"][^>]*><tbody>/gi, \"\");" + lineEnding +
                          "  return result;" + lineEnding + "};";
  if (content.includes(targetText)) {
    content = content.replace(targetText, replacementText);
    fs.writeFileSync(file5, content, "utf8");
    console.log("Successfully patched ExportHtml.ts");
  } else {
    const targetTextLF = "  return pieces.join('');\n};";
    const replacementTextLF = "  let result = pieces.join('');\n" +
                              "  result = result.replace(/<\\/tbody><\\/table>\\s*<br\\s*\\/?>\\s*<table class=['\"]data-tables['\"][^>]*><tbody>/gi, \"\");\n" +
                              "  return result;\n};";
    if (content.includes(targetTextLF)) {
      content = content.replace(targetTextLF, replacementTextLF);
      fs.writeFileSync(file5, content, "utf8");
      console.log("Successfully patched ExportHtml.ts");
    } else {
      console.log("Could not find target return block in ExportHtml.ts");
    }
  }
}

// 6. Patch initialisation.js (disable table toolbar button and context menu in read-only mode)
const file6 = "/opt/etherpad-lite/src/node_modules/ep_tables4/static/js/initialisation.js";
if (fs.existsSync(file6)) {
  let content = fs.readFileSync(file6, "utf8");
  const lineEnding = content.includes("\r\n") ? "\r\n" : "\n";
  
  if (!content.includes("Synchronize name from parent Jitsi Meet window")) {
    const syncLogic = 
      "  // Synchronize name from parent Jitsi Meet window if running in an iframe" + lineEnding +
      "  try {" + lineEnding +
      "    const syncName = () => {" + lineEnding +
      "      if (window.parent && window.parent.APP && window.parent.APP.store) {" + lineEnding +
      "        const state = window.parent.APP.store.getState();" + lineEnding +
      "        let jitsiName = state && state['features/base/settings'] && state['features/base/settings'].displayName;" + lineEnding +
      "        if (!jitsiName) {" + lineEnding +
      "          const participants = state && state['features/base/participants'];" + lineEnding +
      "          if (participants) {" + lineEnding +
      "            const localPart = Array.isArray(participants) ? participants.find(p => p && p.local) : Object.values(participants).find(p => p && p.local);" + lineEnding +
      "            jitsiName = localPart && (localPart.name || localPart.displayName);" + lineEnding +
      "          }" + lineEnding +
      "        }" + lineEnding +
      "        const jitsiConfig = state && state['features/base/config'];" + lineEnding +
      "        const defaultName = jitsiConfig && (jitsiConfig.defaultRemoteDisplayName || jitsiConfig.defaultLocalDisplayName) || 'CMC ATIer';" + lineEnding +
      "        if (!jitsiName || jitsiName === 'Fellow Jitster') {" + lineEnding +
      "          jitsiName = defaultName;" + lineEnding +
      "        }" + lineEnding +
      "        const currentEplName = window.pad && window.pad.myUserInfo && window.pad.myUserInfo.name;" + lineEnding +
      "        if (jitsiName !== currentEplName) {" + lineEnding +
      "          window.pad.notifyChangeName(jitsiName);" + lineEnding +
      "          window.pad.myUserInfo.name = jitsiName;" + lineEnding +
      "          $('#myusernameedit').val(jitsiName);" + lineEnding +
      "        }" + lineEnding +
      "      }" + lineEnding +
      "    };" + lineEnding +
      "    setTimeout(syncName, 1000);" + lineEnding +
      "    setInterval(syncName, 3000);" + lineEnding +
      "  } catch (e) {" + lineEnding +
      "    console.error('Failed to sync name from Jitsi parent window:', e);" + lineEnding +
      "  }" + lineEnding + lineEnding;

    content = content.replace(
      /exports\.postAceInit\s*=\s*function\s*\(hook,\s*context\)\s*\{\s*/,
      "exports.postAceInit = function (hook, context) {" + lineEnding +
      syncLogic +
      "  if (window.clientVars && window.clientVars.readonly) {" + lineEnding +
      "    $('#table-menu-button').parent().hide();" + lineEnding +
      "    $('#table-menu-button').parent().prev('.separator').hide();" + lineEnding +
      "    return;" + lineEnding +
      "  }" + lineEnding
    );
    fs.writeFileSync(file6, content, "utf8");
    console.log("Successfully patched initialisation.js with Jitsi display name sync");
  } else {
    let changed = false;
    if (!content.includes("features/base/participants")) {
      const oldLine = "const jitsiName = state && state['features/base/settings'] && state['features/base/settings'].displayName;";
      const newLine = 
        "let jitsiName = state && state['features/base/settings'] && state['features/base/settings'].displayName;" + lineEnding +
        "        if (!jitsiName) {" + lineEnding +
        "          const participants = state && state['features/base/participants'];" + lineEnding +
        "          if (participants) {" + lineEnding +
        "            const localPart = Array.isArray(participants) ? participants.find(p => p && p.local) : Object.values(participants).find(p => p && p.local);" + lineEnding +
        "            jitsiName = localPart && (localPart.name || localPart.displayName);" + lineEnding +
        "          }" + lineEnding +
        "        }";
      content = content.replace(oldLine, newLine);
      changed = true;
      console.log("Successfully upgraded initialisation.js to new Jitsi display name sync");
    }
    if (content.includes("find(p => p.local)")) {
      content = content.replace(/find\(p => p\.local\)/g, "find(p => p && p.local)");
      changed = true;
      console.log("Successfully added safety check p => p && p.local to initialisation.js");
    }
    if (content.includes("if (jitsiName) {")) {
      const oldBlock = 
        "        if (jitsiName) {" + lineEnding +
        "          const currentEplName = window.pad && window.pad.myUserInfo && window.pad.myUserInfo.name;" + lineEnding +
        "          if (jitsiName !== currentEplName) {" + lineEnding +
        "            window.pad.notifyChangeName(jitsiName);" + lineEnding +
        "            window.pad.myUserInfo.name = jitsiName;" + lineEnding +
        "            $('#myusernameedit').val(jitsiName);" + lineEnding +
        "          }" + lineEnding +
        "        }";
      const newBlock =
        "        const jitsiConfig = state && state['features/base/config'];" + lineEnding +
        "        const defaultName = jitsiConfig && (jitsiConfig.defaultRemoteDisplayName || jitsiConfig.defaultLocalDisplayName) || 'CMC ATIer';" + lineEnding +
        "        if (!jitsiName || jitsiName === 'Fellow Jitster') {" + lineEnding +
        "          jitsiName = defaultName;" + lineEnding +
        "        }" + lineEnding +
        "        const currentEplName = window.pad && window.pad.myUserInfo && window.pad.myUserInfo.name;" + lineEnding +
        "        if (jitsiName !== currentEplName) {" + lineEnding +
        "          window.pad.notifyChangeName(jitsiName);" + lineEnding +
        "          window.pad.myUserInfo.name = jitsiName;" + lineEnding +
        "          $('#myusernameedit').val(jitsiName);" + lineEnding +
        "        }";
      content = content.replace(oldBlock, newBlock);
      changed = true;
      console.log("Successfully upgraded initialisation.js to dynamic Jitsi default name sync");
    }
    if (changed) {
      fs.writeFileSync(file6, content, "utf8");
    }
  }
}

// 7. Patch datatablesScriptsTimeslider.ejs (fix timeslider script loading path)
const file7 = "/opt/etherpad-lite/src/node_modules/ep_tables4/templates/datatablesScriptsTimeslider.ejs";
if (fs.existsSync(file7)) {
  let content = fs.readFileSync(file7, "utf8");
  content = content.replace(
    /src=['"]\.\.\/static\/plugins\/ep_tables4\/static\/js\/datatables-renderer\.js['"]/,
    'src="../../static/plugins/ep_tables4/static/js/datatables-renderer.js"'
  );
  fs.writeFileSync(file7, content, "utf8");
  console.log("Successfully patched datatablesScriptsTimeslider.ejs");
}

// 8. Fix CSS typo stikyUsers -> stickyUsers and disable chat globally in layout.css
const layoutCssFile = "/opt/etherpad-lite/src/static/css/pad/layout.css";
if (fs.existsSync(layoutCssFile)) {
  let content = fs.readFileSync(layoutCssFile, "utf8");
  if (content.includes("stikyUsers")) {
    content = content.replace(/stikyUsers/g, "stickyUsers");
  }
  // Append rules to disable chat completely
  const disableChatCss = "\n\n/* Disable chat feature completely */\n#chaticon, #chatbox, #options-stickychat, #options-stickychat + label, #options-chatandusers, #options-chatandusers + label {\n  display: none !important;\n}\n";
  if (!content.includes("Disable chat feature completely")) {
    content += disableChatCss;
  }
  fs.writeFileSync(layoutCssFile, content, "utf8");
  console.log("Successfully fixed stikyUsers typo and disabled chat globally in layout.css");
}

// 9. Remove unused/missing ep_message_all plugin definition from ep.json to prevent console error
const epJsonFile = "/opt/etherpad-lite/src/ep.json";
if (fs.existsSync(epJsonFile)) {
  try {
    const epJson = JSON.parse(fs.readFileSync(epJsonFile, "utf8"));
    if (epJson && Array.isArray(epJson.parts)) {
      const originalLength = epJson.parts.length;
      epJson.parts = epJson.parts.filter(part => part.name !== "ep_message_all");
      if (epJson.parts.length !== originalLength) {
        fs.writeFileSync(epJsonFile, JSON.stringify(epJson, null, 2), "utf8");
        console.log("Successfully removed ep_message_all from ep.json");
      }
    }
  } catch (e) {
    console.error("Error patching ep.json:", e);
  }
}

// 10. Patch Minify.js to allow serving client-side assets of helper/font plugins
const minifyFile = "/opt/etherpad-lite/src/node/utils/Minify.js";
if (fs.existsSync(minifyFile)) {
  let content = fs.readFileSync(minifyFile, "utf8");
  
  // Define whitelist if not already present
  const whitelistCode = `
// Whitelist of root files in plugins that are required on the client-side
const ALLOWED_PLUGIN_ROOT_FILES = {
  'ep_plugin_helpers': ['/attributes.js', '/toolbar-select.js'],
  'ep_font_family': ['/fonts.js']
};
`;
  if (!content.includes("ALLOWED_PLUGIN_ROOT_FILES")) {
    content = whitelistCode + content;
  }

  const originalPattern = "plugins.plugins[library] && match[3]";
  const previousPatchedPattern = 'plugins.plugins[library] && (match[3] || library === "ep_plugin_helpers")';
  const targetReplacement = "plugins.plugins[library] && (match[3] || (ALLOWED_PLUGIN_ROOT_FILES[library] && ALLOWED_PLUGIN_ROOT_FILES[library].includes(libraryPath)))";

  if (content.includes(originalPattern)) {
    content = content.replace(originalPattern, targetReplacement);
    fs.writeFileSync(minifyFile, content, "utf8");
    console.log("Successfully patched Minify.js with whitelist (original)");
  } else if (content.includes(previousPatchedPattern)) {
    content = content.replace(previousPatchedPattern, targetReplacement);
    fs.writeFileSync(minifyFile, content, "utf8");
    console.log("Successfully patched Minify.js with whitelist (previous patched)");
  }
}

// 11. Patch ep_plugin_helpers/toolbar-select.js to prevent focus loss and restore focus asynchronously
const toolbarSelectFile = "/opt/etherpad-lite/src/plugin_packages/ep_plugin_helpers/toolbar-select.js";
if (fs.existsSync(toolbarSelectFile)) {
  let content = fs.readFileSync(toolbarSelectFile, "utf8");
  
  const targetFunction = `const toolbarSelect = (rawConfig) => {
  const cfg = validateConfig(rawConfig);
  const coercer = resolveCoerce(cfg.coerce);

  // window.$ is jQuery as exposed by Etherpad's pad bundle. We don't import
  // jquery directly so the helper works whether the host plugin pulls jQuery
  // from the same npm version or relies on the bundled one.
  const $sel = window.$(cfg.selector);

  $sel.on('change', function onToolbarSelectChange() {
    const $this = window.$(this);
    const raw = $this.val();
    const value = coercer(raw);

    if (value != null) {
      cfg.context.ace.callWithAce((ace) => {
        cfg.invoke(ace, value);
      }, cfg.op, true);
      $this.val(cfg.resetValue);
    }

    // Focus restoration runs unconditionally: even if the coerced value was
    // unusable, the user clicked the select and we don't want to leave focus
    // stuck on a toolbar control where the next keystroke would be lost
    // (or, in some browsers, scroll the select's option list).
    cfg.context.ace.focus();

    if (cfg.onAfterChange) {
      try { cfg.onAfterChange(value); } catch (e) {
        // eslint-disable-next-line no-console
        if (typeof console !== 'undefined') console.error('toolbarSelect onAfterChange threw', e);
      }
    }
  });

  return {$sel};
};`;

  const replacementFunction = `const toolbarSelect = (rawConfig) => {
  const cfg = validateConfig(rawConfig);
  const coercer = resolveCoerce(cfg.coerce);

  const $sel = window.$(cfg.selector);

  // Prevent focus loss when clicking nice-select dropdown
  window.$(document).on('mousedown', '.nice-select', (e) => {
    e.preventDefault();
  });

  $sel.on('change', function onToolbarSelectChange() {
    const $this = window.$(this);
    const raw = $this.val();
    const value = coercer(raw);

    if (value != null) {
      cfg.context.ace.focus();
      cfg.context.ace.callWithAce((ace) => {
        cfg.invoke(ace, value);
      }, cfg.op, true);
      $this.val(cfg.resetValue);
    }

    setTimeout(() => {
      cfg.context.ace.focus();
    }, 50);

    if (cfg.onAfterChange) {
      try { cfg.onAfterChange(value); } catch (e) {
        if (typeof console !== 'undefined') console.error('toolbarSelect onAfterChange threw', e);
      }
    }
  });

  return {$sel};
};`;

  content = content.replace(targetFunction, replacementFunction);
  fs.writeFileSync(toolbarSelectFile, content, "utf8");
  console.log("Successfully patched toolbar-select.js");
}

// 12. Patch ep_font_size/static/js/index.js (ace_doInsertsizes collapsed selection + exports.aceEditEvent)
const fontSizeIndexFile = "/opt/etherpad-lite/src/plugin_packages/ep_font_size/static/js/index.js";
if (fs.existsSync(fontSizeIndexFile)) {
  let content = fs.readFileSync(fontSizeIndexFile, "utf8");
  
  // Replace doInsertsizes implementation
  const targetDoInsert = `  context.editorInfo.ace_doInsertsizes = (level) => {
    const {rep, documentAttributeManager} = context;
    if (!(rep.selStart && rep.selEnd)) return;
    if (level >= 0 && shared.sizes[level] === undefined) return;
    const newSize = ['font-size', level >= 0 ? shared.sizes[level] : ''];
    documentAttributeManager.setAttributesOnRange(rep.selStart, rep.selEnd, [newSize]);
  };`;
  
  const replacementDoInsert = `  context.editorInfo.ace_doInsertsizes = (level) => {
    const {rep, documentAttributeManager} = context;
    if (!(rep.selStart && rep.selEnd)) return;
    if (level >= 0 && shared.sizes[level] === undefined) return;
    const sizeVal = level >= 0 ? shared.sizes[level] : '';
    const isCollapsed = rep.selStart[0] === rep.selEnd[0] && rep.selStart[1] === rep.selEnd[1];
    if (isCollapsed) {
      if (!window.pendingAttributes) window.pendingAttributes = {};
      window.pendingAttributes['font-size'] = sizeVal;
      window.pendingCaretPosition = [rep.selStart[0], rep.selStart[1]];
    } else {
      const newSize = ['font-size', sizeVal];
      documentAttributeManager.setAttributesOnRange(rep.selStart, rep.selEnd, [newSize]);
    }
  };`;
  
  content = content.replace(targetDoInsert, replacementDoInsert);
  
  // Append exports.aceEditEvent
  const editEventCode = `
exports.aceEditEvent = (hook, call) => {
  const cs = call.callstack;
  const rep = call.rep;
  const attrManager = call.documentAttributeManager;
  
  const isSamePosition = (pos1, pos2) => {
    if (!pos1 || !pos2) return false;
    return pos1[0] === pos2[0] && pos1[1] === pos2[1];
  };

  // Carry over styles when Enter is pressed
  if (!window.lastLineCount) {
    window.lastLineCount = rep.lines.length();
  }
  if (cs.docTextChanged && cs.isUserChange) {
    const currentLineCount = rep.lines.length();
    if (currentLineCount > window.lastLineCount) {
      const prevL = rep.selStart[0] - 1;
      if (prevL >= 0) {
        const prevLine = rep.lines.atIndex(prevL);
        if (prevLine && prevLine.text) {
          const prevLineLen = prevLine.text.length;
          let prevCharIdx = prevLineLen - 1;
          if (prevCharIdx > 0 && prevLine.text[prevCharIdx] === '\\n') {
            prevCharIdx--;
          }
          const prevAttribs = attrManager.getAttributesOnPosition(prevL, prevCharIdx);
          if (prevAttribs && prevAttribs.length > 0) {
            if (!window.pendingAttributes) window.pendingAttributes = {};
            for (const [attrName, attrValue] of prevAttribs) {
              if (attrName === 'color' || attrName === 'font-size' || attrName === 'bold' || attrName === 'italic' || attrName === 'underline' || attrName === 'strikethrough') {
                window.pendingAttributes[attrName] = attrValue;
              } else if (attrValue === 'true' && attrName.startsWith('font')) {
                window.pendingAttributes[attrName] = 'true';
              }
            }
            window.pendingCaretPosition = [rep.selStart[0], rep.selStart[1]];
          }
        }
      }
    }
    window.lastLineCount = currentLineCount;
  }

  // Apply pending attributes on typing
  if (cs.docTextChanged && cs.isUserChange && window.pendingAttributes && Object.keys(window.pendingAttributes).length > 0 && window.pendingCaretPosition) {
    const start = window.pendingCaretPosition;
    const end = rep.selEnd;
    if (start && end && (start[0] < end[0] || (start[0] === end[0] && start[1] < end[1]))) {
      const attribs = Object.entries(window.pendingAttributes);
      attrManager.setAttributesOnRange(start, end, attribs);
      window.pendingAttributes = {};
      window.pendingCaretPosition = null;
    }
  } else if (cs.type === 'handleClick' || cs.type === 'handleKeyEvent') {
    if (window.pendingCaretPosition && !isSamePosition(rep.selStart, window.pendingCaretPosition)) {
      window.pendingAttributes = {};
      window.pendingCaretPosition = null;
    }
  }

  if (!(cs.type === 'handleClick') && !(cs.type === 'handleKeyEvent') && !(cs.docTextChanged)) {
    return;
  }
  if (cs.type === 'setBaseText' || cs.type === 'setup') return;

  setTimeout(() => {
    const sizeSelect = $('#font-size, select.size-selection');
    const shared = require('./shared');
    const defaultIdx = shared.sizes.indexOf(14);
    sizeSelect.val(defaultIdx !== -1 ? defaultIdx : 6); // Default size 14px

    if (window.pendingAttributes && window.pendingAttributes['font-size']) {
      const pendingSize = window.pendingAttributes['font-size'];
      const idx = shared.sizes.indexOf(parseInt(pendingSize, 10));
      if (idx !== -1) {
        sizeSelect.val(idx);
      }
    } else if (attrManager && rep.selStart) {
      const row = rep.selStart[0];
      const col = rep.selStart[1];
      let charIdx = col;
      if (col > 0) {
        charIdx = col - 1;
      }
      const startAttribs = attrManager.getAttributesOnPosition(row, charIdx);
      const [startSize] = startAttribs.filter((item) => item[0] === 'font-size');
      if (startSize) {
        const idx = shared.sizes.indexOf(parseInt(startSize[1], 10));
        if (idx !== -1) {
          sizeSelect.val(idx);
        }
      }
    }
    sizeSelect.niceSelect('update');
  }, 250);
};
`;
  if (!content.includes("exports.aceEditEvent")) {
    content += editEventCode;
  }
  
  fs.writeFileSync(fontSizeIndexFile, content, "utf8");
  console.log("Successfully patched ep_font_size/static/js/index.js");
}

// 13. Patch ep_font_size/ep.json to register aceEditEvent hook
const fontSizeEpJsonFile = "/opt/etherpad-lite/src/plugin_packages/ep_font_size/ep.json";
if (fs.existsSync(fontSizeEpJsonFile)) {
  try {
    const epJson = JSON.parse(fs.readFileSync(fontSizeEpJsonFile, "utf8"));
    if (epJson && Array.isArray(epJson.parts) && epJson.parts[0] && epJson.parts[0].client_hooks) {
      epJson.parts[0].client_hooks.aceEditEvent = "ep_font_size/static/js/index";
      fs.writeFileSync(fontSizeEpJsonFile, JSON.stringify(epJson, null, 2), "utf8");
      console.log("Successfully registered aceEditEvent in ep_font_size/ep.json");
    }
  } catch (e) {
    console.error("Error patching ep_font_size/ep.json:", e);
  }
}

// 14. Patch ep_font_color/static/js/index.js (doInsertColors collapsed + aceEditEvent integration)
const fontColorIndexFile = "/opt/etherpad-lite/src/plugin_packages/ep_font_color/static/js/index.js";
if (fs.existsSync(fontColorIndexFile)) {
  let content = fs.readFileSync(fontColorIndexFile, "utf8");
  
  const targetDoInsert = `const doInsertColors = function (level) {
  const rep = this.rep;
  const documentAttributeManager = this.documentAttributeManager;
  if (!(rep.selStart && rep.selEnd) || (level >= 0 && colors[level] === undefined)) {
    return;
  }

  let newColor = ['color', ''];
  if (level >= 0) {
    newColor = ['color', colors[level]];
  }

  documentAttributeManager.setAttributesOnRange(rep.selStart, rep.selEnd, [newColor]);
};`;

  const replacementDoInsert = `const doInsertColors = function (level) {
  const rep = this.rep;
  const documentAttributeManager = this.documentAttributeManager;
  if (!(rep.selStart && rep.selEnd) || (level >= 0 && colors[level] === undefined)) {
    return;
  }

  const colorVal = level >= 0 ? colors[level] : '';
  const isCollapsed = rep.selStart[0] === rep.selEnd[0] && rep.selStart[1] === rep.selEnd[1];
  
  if (isCollapsed) {
    if (!window.pendingAttributes) window.pendingAttributes = {};
    window.pendingAttributes['color'] = colorVal;
    window.pendingCaretPosition = [rep.selStart[0], rep.selStart[1]];
  } else {
    documentAttributeManager.setAttributesOnRange(rep.selStart, rep.selEnd, [['color', colorVal]]);
  }
};`;

  content = content.replace(targetDoInsert, replacementDoInsert);

  const targetEditEvent = `exports.aceEditEvent = (hook, call) => {
  const cs = call.callstack;
  const attrManager = call.documentAttributeManager;
  const rep = call.rep;
  const allowedEvents = ['handleClick', 'handleKeyEvent'];
  if (allowedEvents.indexOf(cs.type) === -1 && !(cs.docTextChanged)) {
    return;
  }

  if (cs.type === 'setBaseText' || cs.type === 'setup') return;
  setTimeout(() => {
    const colorSelect = $('.color-selection, #color-selection');
    colorSelect.val('dummy');
    colorSelect.niceSelect('update');
    if (rep.selStart[1] === 0) return;
    if (rep.selStart[1] === 1) {
      if (rep.alltext[0] === '*') return;
    }
    const startAttribs = attrManager.getAttributesOnPosition(rep.selStart[0], rep.selStart[1]);
    const endAttribs = attrManager.getAttributesOnPosition(rep.selEnd[0], rep.selEnd[1]);
    const [startColor] = startAttribs.filter((item) => item[0] === 'color');
    const [endColor] = endAttribs.filter((item) => item[0] === 'color');
    if (!startColor && !endColor) return;
    $.each(colors, (k, v) => {
      if (startColor && startColor[1] === v && (!endColor || endColor[1] === v)) {
        colorSelect.val(k);
      } else if (!startColor && endColor[1] === v) {
        colorSelect.val(k);
      }
    });
    colorSelect.niceSelect('update');
  }, 250);
};`;

  const replacementEditEvent = `exports.aceEditEvent = (hook, call) => {
  const cs = call.callstack;
  const attrManager = call.documentAttributeManager;
  const rep = call.rep;
  
  const isSamePosition = (pos1, pos2) => {
    if (!pos1 || !pos2) return false;
    return pos1[0] === pos2[0] && pos1[1] === pos2[1];
  };

  if (cs.docTextChanged && cs.isUserChange && window.pendingAttributes && Object.keys(window.pendingAttributes).length > 0 && window.pendingCaretPosition) {
    const start = window.pendingCaretPosition;
    const end = rep.selEnd;
    if (start && end && (start[0] < end[0] || (start[0] === end[0] && start[1] < end[1]))) {
      const attribs = Object.entries(window.pendingAttributes);
      attrManager.setAttributesOnRange(start, end, attribs);
      window.pendingAttributes = {};
      window.pendingCaretPosition = null;
    }
  } else if (cs.type === 'handleClick' || cs.type === 'handleKeyEvent') {
    if (window.pendingCaretPosition && !isSamePosition(rep.selStart, window.pendingCaretPosition)) {
      window.pendingAttributes = {};
      window.pendingCaretPosition = null;
    }
  }

  const allowedEvents = ['handleClick', 'handleKeyEvent'];
  if (allowedEvents.indexOf(cs.type) === -1 && !(cs.docTextChanged)) {
    return;
  }

  if (cs.type === 'setBaseText' || cs.type === 'setup') return;
  setTimeout(() => {
    const colorSelect = $('.color-selection, #color-selection');
    colorSelect.val(0); // Default to black

    if (window.pendingAttributes && window.pendingAttributes['color']) {
      const pendingColor = window.pendingAttributes['color'];
      const idx = colors.indexOf(pendingColor);
      if (idx !== -1) {
        colorSelect.val(idx);
      }
    } else if (attrManager && rep.selStart) {
      const row = rep.selStart[0];
      const col = rep.selStart[1];
      let charIdx = col;
      if (col > 0) {
        charIdx = col - 1;
      }
      const startAttribs = attrManager.getAttributesOnPosition(row, charIdx);
      const [startColor] = startAttribs.filter((item) => item[0] === 'color');
      if (startColor) {
        const idx = colors.indexOf(startColor[1]);
        if (idx !== -1) {
          colorSelect.val(idx);
        }
      }
    }
    colorSelect.niceSelect('update');
  }, 250);
};`;

  content = content.replace(targetEditEvent, replacementEditEvent);
  fs.writeFileSync(fontColorIndexFile, content, "utf8");
  console.log("Successfully patched ep_font_color/static/js/index.js");
}

// 15. Patch ep_font_family/static/js/index.js (focus, collapsed family handling, aceEditEvent integration)
const fontFamilyIndexFile = "/opt/etherpad-lite/src/plugin_packages/ep_font_family/static/js/index.js";
if (fs.existsSync(fontFamilyIndexFile)) {
  let content = fs.readFileSync(fontFamilyIndexFile, "utf8");
  
  const targetChange = `  select.on('change', function () {
    const value = $(this).val();
    context.ace.callWithAce((ace) => {
      for (const f of fonts) {
        ace.ace_setAttributeOnSelection(f, false);
      }
      ace.ace_setAttributeOnSelection(value, true);
    }, 'insertfontFamily', true);
    context.ace.focus();
  });`;

  const replacementChange = `  select.on('change', function () {
    const value = $(this).val();
    context.ace.focus();
    context.ace.callWithAce((ace) => {
      const rep = ace.ace_getRep();
      const isCollapsed = rep.selStart[0] === rep.selEnd[0] && rep.selStart[1] === rep.selEnd[1];
      if (isCollapsed) {
        if (!window.pendingAttributes) window.pendingAttributes = {};
        for (const f of fonts) {
          delete window.pendingAttributes[f];
        }
        window.pendingAttributes[value] = 'true';
        window.pendingCaretPosition = [rep.selStart[0], rep.selStart[1]];
      } else {
        for (const f of fonts) {
          ace.ace_setAttributeOnSelection(f, false);
        }
        ace.ace_setAttributeOnSelection(value, true);
      }
    }, 'insertfontFamily', true);
    setTimeout(() => {
      context.ace.focus();
    }, 50);
  });
  
  // Prevent focus loss when clicking nice-select dropdown
  $(document).on('mousedown', '.nice-select', (e) => {
    e.preventDefault();
  });`;

  content = content.replace(targetChange, replacementChange);

  const targetEditEvent = `exports.aceEditEvent = (hook, call) => {
  const cs = call.callstack;
  if (!(cs.type === 'handleClick') && !(cs.type === 'handleKeyEvent') && !(cs.docTextChanged)) {
    return false;
  }
  if (cs.type === 'setBaseText' || cs.type === 'setup') return false;

  setTimeout(() => {
    const select = $('.family-selection');
    select.val('dummy');

    if (call.rep.selStart[1] === 0) return;
    if (call.rep.selStart[1] === 1 && call.rep.alltext[0] === '*') return;

    for (const font of fonts) {
      if (call.editorInfo.ace_getAttributeOnSelection(font)) {
        select.val(font);
        break;
      }
    }
    select.niceSelect('update');
  }, 250);
};`;

  const replacementEditEvent = `exports.aceEditEvent = (hook, call) => {
  const cs = call.callstack;
  
  const isSamePosition = (pos1, pos2) => {
    if (!pos1 || !pos2) return false;
    return pos1[0] === pos2[0] && pos1[1] === pos2[1];
  };

  if (cs.docTextChanged && cs.isUserChange && window.pendingAttributes && Object.keys(window.pendingAttributes).length > 0 && window.pendingCaretPosition) {
    const start = window.pendingCaretPosition;
    const end = call.rep.selEnd;
    if (start && end && (start[0] < end[0] || (start[0] === end[0] && start[1] < end[1]))) {
      const attribs = Object.entries(window.pendingAttributes);
      call.documentAttributeManager.setAttributesOnRange(start, end, attribs);
      window.pendingAttributes = {};
      window.pendingCaretPosition = null;
    }
  } else if (cs.type === 'handleClick' || cs.type === 'handleKeyEvent') {
    if (window.pendingCaretPosition && !isSamePosition(call.rep.selStart, window.pendingCaretPosition)) {
      window.pendingAttributes = {};
      window.pendingCaretPosition = null;
    }
  }

  if (!(cs.type === 'handleClick') && !(cs.type === 'handleKeyEvent') && !(cs.docTextChanged)) {
    return false;
  }
  if (cs.type === 'setBaseText' || cs.type === 'setup') return false;

  setTimeout(() => {
    const select = $('.family-selection');
    select.val('fontarial'); // Default to Arial

    let foundPending = false;
    if (window.pendingAttributes) {
      for (const font of fonts) {
        if (window.pendingAttributes[font] === 'true') {
          select.val(font);
          foundPending = true;
          break;
        }
      }
    }

    if (!foundPending) {
      const attrManager = call.documentAttributeManager;
      if (attrManager && call.rep.selStart) {
        let foundFont = false;
        for (const font of fonts) {
          if (call.editorInfo.ace_getAttributeOnSelection(font)) {
            select.val(font);
            foundFont = true;
            break;
          }
        }
        if (!foundFont) {
          const row = call.rep.selStart[0];
          const col = call.rep.selStart[1];
          let charIdx = col;
          if (col > 0) {
            charIdx = col - 1;
          }
          const startAttribs = attrManager.getAttributesOnPosition(row, charIdx);
          for (const font of fonts) {
            const [hasFont] = startAttribs.filter((item) => item[0] === font && item[1] === 'true');
            if (hasFont) {
              select.val(font);
              break;
            }
          }
        }
      }
    }
    select.niceSelect('update');
  }, 250);
};`;

  content = content.replace(targetEditEvent, replacementEditEvent);
  fs.writeFileSync(fontFamilyIndexFile, content, "utf8");
  console.log("Successfully patched ep_font_family/static/js/index.js");
}



