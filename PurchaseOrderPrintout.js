/**
 * Created by nowee on 13/11/2015.
 */


/**
 * Prints the purchase order given
 * @param request
 * @param response
 */
function print(request, response) {
    var record = nlapiLoadRecord(request.getParameter("recordType"),
    request.getParameter("recordId"));
    generateReport(record, response);
    
}

/**
 * Generates a page per page table
 * @param  {Array} contents array of items containing details for item
 * @return {String}          HTMLString containing a table set.
 */
function buildTableSet(contents, totalLabel) {
    var table = "<div class='po_details'><table page-break-inside='avoid'>" +
        "<tbody>",
        carryOver = 0.00;
    for (var c = 0, length = contents.length; c < length; c++) {
        table += "<tr>" +
            "<td>" + "</td>" +
            "</tr>";
    }
    table += "<tr>" +
        "<td width='300px'></td>" +
        "<td></td>" +
        "<td align='right'><b>" + totalLabel + "</b></td>" +
        "<td align='right'><b>" + addCommas(carryOver.toFixed(2)) + "</b></td>" +
        "</tr>";
    return table + "</tbody></table></div><pbr/>";
}

function getTableHeader() {
    return "<div class='po_details'><table page-break-inside='avoid'>" +
        "<tbody>";
}

/**
 * [getMrNo description]
 * @param  {nlobjRecord} record [description]
 * @return {[type]}        [description]
 */
function getMrNo(record, lineitems) {
    var mr = "";
    var mrs = [];
    for (var c = 1; c <= lineitems; c++) {
        var tmp = record.getLineItemText("item", "linkedorder", c);
      if(c == 1){
        mr += tmp;
        mrs.push(tmp);
      }else{
        nlapiLogExecution('DEBUG','VALUES',(c==2) +" : "+ (!mrs[1]))
        if(c==2 && mrs.indexOf(tmp)<0){
            mr += tmp;
            mrs.push(tmp);
        }
        nlapiLogExecution('DEBUG','AS', mrs.indexOf(tmp)<0)
      	if (mrs.indexOf(tmp)<0) {
            mr += ", "+tmp;
            mrs.push(tmp);
        }
      }
    }
    return mr;
}

/**
 * Generates the report body
 * @param report
 */
 nosignpic = 36399;
function generateReport(record, response) {
    /*custcol_classcode + description
    quantity + units */
    var grandtotalbox = "";
    var carryoverbox = "";
    var table = getTableHeader();
    var location = record.getFieldText("location");
    var locationSplitLength = location.split(":").length;
    if (locationSplitLength > 0) {
        location = location.split(":")[locationSplitLength - 1];
    }
    var date = record.getFieldValue("trandate");
    var project = record.getFieldText("class");
    	project = project ? project.split(':')[project.split(':').length-1] : "";
    // project = (project) ? nlapiLookupField("job", project,"companyname") : "";
    var subproject = record.getFieldValue("class");
    var subprojectDisplay = "";
    var filter = [
        new nlobjSearchFilter("internalid", null, "is", subproject)
    ];
    var search = nlapiSearchRecord(null, "customsearch372", filter);
    if (search) {
        subprojectDisplay = search[0].getValue("formulatext");
    }
    var lineItemCount = record.getLineItemCount("item");
    var mrno = getMrNo(record, lineItemCount);
    var terms = record.getFieldText("terms");
    var poNo = record.getFieldValue("tranid");
    var vendor = record.getFieldText("entity");
    vendor = vendor ? vendor.substr(vendor.indexOf(" ")) : "";
    var currency = record.getFieldValue("currencysymbol");
    var deliverydate = record.getFieldValue("custbody_mcc_datedelivered");
    var user = nlapiGetContext().name;
    var totalQty = 0;
    var grandTotal = 0.00,
        grossamt = 0.00,
        amt = 0.00,
        tmptotal = 0.00,
        totalCounter = 1;
    var cc = "";
    var html = nlapiLoadFile(1114).getValue();
    var customform = record.getFieldText("customform");
    var grossamt, rate, qty, description, itemName, itemCode, classcode, brand, itemCounter = 1,
        carryOver = 0.00,
        taxAmt = 0.00,
        assetName, assetCode, plateNo, additionalDescription, recoAppr, recoApprSig,
        headerDescription, contentsHolder = [],
        itemsAdded = 1,
        isIndedted = false,
        hasGrandTotal = false,
        units, chars = 0;
    for (var c = 1; c <= lineItemCount; c++) {
        if (record.getLineItemValue("item", "isclosed", c) == "F") {
            var currentItem = record.getLineItemValue("item", "item", c);
            currentItem = parseInt(currentItem);
            headerDescription = "";
            if (currentItem == 831 || currentItem == 835) {
                isIndedted = true;
                headerDescription = record.getLineItemValue("item", "custcol_mcc_custdesc", c);
            } else {
                isIndedted = false;
            }
            additionalDescription = (currentItem == 835) ? "" :
                record.getLineItemValue("item", "custcol_mcc_custdesc", c);
                additionalDescription = additionalDescription ? additionalDescription : "";
            itemName = (currentItem == 835) ? record.getLineItemValue("item", "custcol_mcc_custdesc", c) :
                record.getLineItemValue("item", "item_display", c);
                itemName = itemName ? itemName : "";
            itemCode = (itemName) ? itemName.substr(0, itemName.indexOf(" ")) : "";
            classcode = record.getLineItemText("item", "custcol_projecttask", c);
            classcode = classcode ? classcode : record.getLineItemValue("item", "custcol_classcode_display", c);
            classcode = classcode ? classcode : "";
            assetName = record.getLineItemText("item", "custcol_mcc_asset_name", c);
            assetName = assetName ? assetName : "";
            // assetName = (assetName) ? assetName.substr(assetName.indexOf(" ")) : ""
            // assetCode = (assetName) ? assetName.substr(0, assetName.indexOf(" ")) : "";
            plateNo = record.getLineItemValue("item", "custcol_mcc_asset_distinction", c);
            plateNo = plateNo ? plateNo : "";
            brand = record.getLineItemText("item", "custcol2", c);
            itemName = (brand) ? itemName + " (" + brand + ")" : itemName;
            qty = record.getLineItemValue("item", "quantity", c);
            units = record.getLineItemText("item", "units", c);
            rate = parseFloat(record.getLineItemValue("item", "rate", c));
            rate = isNaN(rate) ? 0.00 : rate;
            taxRate = parseFloat(record.getLineItemValue('item', 'taxrate1', c))
            taxRate = isNaN(taxRate) ? 0.00 : (taxRate / 100);
            taxAmt = parseFloat(record.getLineItemValue("item", "tax1amt", c));
            taxAmt = isNaN(taxAmt) ? 0.00 : taxAmt;
            grossamt = parseFloat(record.getLineItemValue("item", "grossamt", c));
            grossamt = isNaN(grossamt) ? 0.00 : grossamt;
            var hdLength = 0;
            if(headerDescription){
                hdLength = headerDescription.length;
            }
            chars += parseInt(parseInt(hdLength) + parseInt(itemName.length) + parseInt(additionalDescription.length) + parseInt(plateNo.length) + parseInt(classcode.length) + 50);
            if ( chars > 400 && (c%4 == 0 )) { //itemsAdded / 4 == 1
                if (c != lineItemCount || chars > 400) {
                    table += "</tbody></table></div>";
                table += 
                "<div class='grand-total-box'>"+
                  "<table>" +
                    "<tr>" +
                      "<td align='left'>Carry Over:</td>"  +
                      "<td align='right' class='total'>"+ addCommas(carryOver.toFixed(2)) +"</td>" +
                    "</tr>" +
                  "</table>" +
                "</div>";
                    table += "<pbr/>";
                    table += getTableHeader();
                    table += "<tr>" +
                    	"<td class='desc'></td>" + 
                    	"<td class='qty'></td>" +
                        "<td class='unit_price' align='right'><b>Carry Over: </b></td>" +
                        "<td class='total' align='right'><p>" + addCommas(carryOver.toFixed(2)) + "</p><p></p></td>" +
                        "</tr>";
                        chars = 0;
                } else {
                  hasGrandTotal = true;
                }
                itemsAdded = 1;
            }
            if (currentItem != 831 && currentItem != 835) {
                if(assetName) {
                  table +=
                  "<tr>" +
                    "<td class='desc'>" +
                      "<p align='left'>"  + assetName + " " + plateNo + "</p>" +
                    "</td>" +
                    "<td colspan='3'></td>" +
                  "</tr>";
                }
                  table +=
                  "<tr>" +
                    "<td class='desc'>";
                      assetName ? table+="<p align='left' padding-left='0.25cm'>" : table+="<p align='left'>"; table+= itemName + " " + additionalDescription + "</p>";
                      assetName ? table+="<p padding-left='0.50cm'>" : table+="<p padding-left='0.25cm'>"; table+= "<b>Class: </b>" + classcode + "</p>"; table+=
                    "<p></p>" +
                    "</td>" +
                    "<td class='qty'>" + qty + " " + units  + "</td>" +
                    "<td class='unit_price'>" + addCommas((rate * (1 + taxRate)).toFixed(2)) + "</td>" +
                    "<td class='total'>" + addCommas(grossamt.toFixed(2)) + "</td>" +
                  "</tr>";
                itemsAdded += 1;
                carryOver += grossamt;
                grandTotal += grossamt;
            } else {
                table += "<tr>" +
                    "<td class='desc'><p align='left'>" + headerDescription + "</p><p></p></td>" +
                    "<td></td>" +
                    "<td></td>" +
                    "<td></td>" +
                    "</tr>";
                itemsAdded += 1;
            }

            if (c == lineItemCount) {
                table += "</tbody></table></div>";
                table += 
                "<div class='grand-total-box'>"+
                  "<table>" +
                    "<tr>" +
                      "<td align='left'>" + currency + "</td>"  +
                      "<td align='right' class='total'>"+ addCommas(carryOver.toFixed(2)) +"</td>" +
                    "</tr>" +
                  "</table>" +
                "</div>";
            }
        } else {
          if (c == lineItemCount) {
            table += "</tbody></table></div>";
            if (!hasGrandTotal) {
                table += 
                "<div class='grand-total-box'>"+
                  "<table>" +
                    "<tr>" +
                      "<td align='left'>Carry Over: </td>"  +
                      "<td align='right' class='total'>"+ addCommas(carryOver.toFixed(2)) +"</td>" +
                    "</tr>" +
                  "</table>" +
                "</div>";
            }
          }
        }
    }
    nlapiLogExecution('debug', 'table contents', table);
	var isVisible = false;
    recoAppr = record.getFieldValue("custbody_mcc_recommending_approval"), recoApprSig;
    recoAppr = recoAppr ? nlapiLookupField('employee', record.getFieldValue("custbody_mcc_recommending_approval"), 'entityid') : "";
   if(recoAppr) {
        recoApprSig = parseInt(nlapiLookupField('employee', record.getFieldValue("custbody_mcc_recommending_approval"), "image"));
		nlapiLogExecution("ERROR", 'doesExist recoApprSig', recoApprSig);
        if(recoApprSig > 0){
			recoApprSig = recoApprSig ? nlapiLoadFile(recoApprSig).getURL() : nlapiLoadFile(nosignpic).getURL();
			recoApprSig = "https://system.netsuite.com" + recoApprSig;
			nlapiLogExecution("ERROR", 'recoApprSig', recoApprSig);
			recoApprSig = "<img postion='absolute' left='25' src='" + recoApprSig + "' height='30px' width='100px' />"; 
			html = html.replace("{recoApprSig}", recoApprSig);
			isVisible = true;
		}	
	}
	
	if(!isVisible){
		html = html.replace("{recoApprSig}", "");
		isVisible = false;
	}
	
    var filter = [],
        columns = [];
    filter.push(new nlobjSearchFilter('entityid', null, 'is', record.getFieldValue("custbody_mcc_prepared_by")));
    columns.push(new nlobjSearchColumn('image'));
    var a = nlapiSearchRecord('employee', null, filter, columns);

  if(a){
    var userid = a[0].getId();
    var userimg = parseInt(nlapiLookupField("employee", userid, "image")), userUrl;
	nlapiLogExecution("ERROR", 'doesExist userimg', userimg);
    if(userimg > 0){
		//userimg = (userimg) ? nlapiLoadFile(userimg).getURL() : nlapiLoadFile(nosignpic).getURL();
		   // userUrl = (userimg) ? "<img position='absolute' left='25' src='" + userimg + 
		userimg = (userimg) ? nlapiLoadFile(userimg).getURL() : "";
		userimg = "https://system.netsuite.com" + userimg;
		nlapiLogExecution("ERROR", 'userimg', userimg);
		userUrl = (userimg) ? "<img left='25' position='absolute' src='"+userimg+"' height='30px' width='100px' />" : "";
		nlapiLogExecution('ERROR', 'URL', userUrl);
		html = html.replace("{prepbysig}", userUrl);
	
	}else{
		html = html.replace("{prepbysig}", "");
	}	
    if (record.getFieldText("approvalstatus").toLowerCase() !== "pending approval") {
       var approverSig = parseInt(record.getFieldValue("nextapprover"));
        if (approverSig > 0) {
            var approverImgFileId = parseInt(nlapiLookupField("employee", approverSig, "image")),approveUrl;
			nlapiLogExecution("ERROR", 'doesExist approverImgFileId', approverImgFileId);
			if(approverImgFileId > 0){
            var approveimg = (approverImgFileId) ? nlapiLoadFile(approverImgFileId).getURL() : "";
				approveimg = 'https://system.netsuite.com' + approveimg;
				nlapiLogExecution("ERROR", 'approveimg', approveimg);
				approveUrl = (approverSig) ? "<img position='absolute' top='140' left='25' src='" + approveimg +
                "' height='30px' width='100px' />" : "";
            html = html.replace("{approvedsig}", approveUrl);
			
			}else{
			html = html.replace("{approvedsig}", "");
			
			}
		}
	}else{
		html = html.replace("{approvedsig}", "");
	}
 }else{
		html = html.replace("{prepbysig}", "");
		
	}

    nlapiLogExecution('DEBUG','lineItemCount',lineItemCount);
    nlapiLogExecution("debug", "TABLE CONTENTS", table);
    //html = html.replace("{approvedsig}", "");
    html = html.replace("{body}", table);
    html = html.replace("{pono}", poNo);
    html = html.replace("{mrno}", mrno);
    html = html.replace("{trandate}", date);
    html = html.replace("{deliverydate}", record.getFieldValue("duedate"));
    html = html.replace("{terms}", terms);
    html = html.replace("{location}", location);
    html = html.replace("{projaddress}", record.getFieldValue('custbody_mcc_bu_address'));
    html = html.replace("{vendoraddress}", record.getFieldValue("billaddress"));
    html = html.replace("{project}", project);
    if (record.getFieldText("customform").toLowerCase().indexOf("prj") > -1) {
        html = html.replace("SubProject:", "");
        html = html.replace("{subproj}", "");
    } else {
        html = html.replace("{subproj}", record.getFieldText("custbody_mcc_subproject"));
    }
    html = html.replace("{warehouse}", location);
    html = html.replace("{vendor}", vendor);
    html = html.replace("{prepby}", record.getFieldValue("custbody_mcc_prepared_by"));
    html = html.replace("{approvedby}", record.getFieldText("nextapprover"));
    html = html.replace("{recoAppr}", recoAppr);
    html = html.replace("{grandtotal}", addCommas(grandTotal.toFixed(2)));
    html = html.replace(/&/g, '&amp;');
    html = html.replace(/null/g, "");
	var pdf = nlapiXMLToPDF(html);
    response.setContentType('PDF', 'PurchaseOrderPrintout.pdf', 'inline');
    response.write(pdf.getValue()); 
}