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
