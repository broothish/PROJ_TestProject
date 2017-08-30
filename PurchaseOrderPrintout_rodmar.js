/**
 * Script Name / Script File : Purchase Order Printout(rod) / PurchaseOrderPrintout_rodmar.js
 * 
 * Script Version: 1.0
 * 
 * Script Type: suitelet
 * 
 * Author: CloudTech
 * 
 * Purpose:
 * 
 * Dependencies:
 * 
 * Notes:			customscript_purchaseorderprintoutrod
 * 					customdeploy_purchaseorderprintoutrod
 * 
 * Project:
 * 
 * Version:			1.0.0 - Date - Initial Release - Nowe
 * 					1.1.0 - 08/25/2017 - ChangeRequest# - ProjectPhase#
 * 							- Fixed PO Printout Issues - Rodmar
 * 
 * Libraries: 
 * 
 */

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

var AVERAGE_CHARS_PER_LINE = 40;
var CHAR_LIMIT_PER_PAGE = 900;
var remainingText = "";
var availableChars = 900;
var continuedSymbol = "</p><p align='center'><i>[***continued***]</i>";
var ADDITIONAL_SPACE_PER_LINEITEM = 40;

 nosignpic = 36399;
function generateReport(record, response) {
	
	//TODO cleanups - RD
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
        	
        	//TODO cleanups - RD
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
            
          //TODO cleanups - RD
            chars += parseInt(parseInt(hdLength) + parseInt(itemName.length) + parseInt(additionalDescription.length) + parseInt(plateNo.length) + parseInt(classcode.length) + 50);
            
            //encapsulate price related details - RD
            var priceDetails = new Object();
            priceDetails.qty = qty;
            priceDetails.units = units;
            priceDetails.rate = rate;
            priceDetails.taxRate = taxRate;
            priceDetails.grossamt = grossamt;
            
            var assetNameAndPlateNo = assetName + " " + plateNo;
            var assetNameAdjustedLength = (Math.ceil(assetNameAndPlateNo.length / AVERAGE_CHARS_PER_LINE)) * AVERAGE_CHARS_PER_LINE;
            
            var classCodeText = classcode;
            var classCodeAdjustedLength = (Math.ceil(classCodeText.length / AVERAGE_CHARS_PER_LINE)) * AVERAGE_CHARS_PER_LINE;
            
            var itemNameText = itemName;
            var itemNameTextAdjustedLength = (Math.ceil(itemNameText.length / AVERAGE_CHARS_PER_LINE)) * AVERAGE_CHARS_PER_LINE;
            
            var additionalDescriptionText = additionalDescription;
            var additionalDescriptionTextAdjustedLength = (Math.ceil(additionalDescriptionText.length / AVERAGE_CHARS_PER_LINE)) * AVERAGE_CHARS_PER_LINE;
            var textThatCanFit = "";
            var shouldDisplayPrice = true;
            var descriptionConsumedMultiplePages = false;
            var textFromSpaceAdjustment = "";
            
            if (currentItem != 831 && currentItem != 835) {
            	
            	carryOver += grossamt;
                grandTotal += grossamt;
            	
	            if(assetName)
	            {
	            	table += getHtmlFor("assetName", assetNameAndPlateNo, assetName, priceDetails, shouldDisplayPrice, classCodeText, itemNameText) //TODO cleanup, itemNameText parameter - Rod
	            	availableChars -= assetNameAdjustedLength; //consume space
	            }
	            
	            table += getHtmlFor("itemName", itemName, assetName, priceDetails, shouldDisplayPrice, classCodeText, itemNameText) //TODO cleanup, itemNameText parameter??? - Rod
	            //consume spaces
	            availableChars -= classCodeAdjustedLength;
	            availableChars -= itemNameTextAdjustedLength;
	            availableChars -= AVERAGE_CHARS_PER_LINE;
	            
	            if(availableChars < 0)
	            {
	            	table += "<tr>" +
                    "<td class='top-bordered' colspan='4' align='right'><b>Carry Over:</b></td>" +
                    "<td class='top-bordered' align='right'>" + addCommas(carryOver.toFixed(2)) + "</td>" +
                    "</tr>";
	            	table += "</tbody></table>";
	            	table += "<pbr/>";
	            	table += "<table>" +
	            	"<tr>" +
                    "<td colspan='4' align='right'><b>Carry Over:</b></td>" +
                    "<td align='right'>" + addCommas(carryOver.toFixed(2)) + "</td>" +
                    "</tr>" +
                    "</table>";
	            	table += getTableHeader();
 	                
            		availableChars = CHAR_LIMIT_PER_PAGE;
	            }
	            
	            if(additionalDescriptionTextAdjustedLength < availableChars)
	            {
	            	textThatCanFit = 
	            		additionalDescriptionText;
	            	availableChars -= textThatCanFit.length; //integer
	            }
	            else
	            {
	            	var finIndex = 0;
	            	if (additionalDescriptionText.length < availableChars){
	            		finIndex = additionalDescriptionText.length;
	            	}
	            	else
	            	{
	            		finIndex = availableChars;
	            	}
	            	
	            	textThatCanFit = additionalDescriptionText.substring(0, finIndex);
	            	
	            	var lastSpacePosition = textThatCanFit.lastIndexOf(" ", textThatCanFit.length)
	                
	                if(lastSpacePosition != -1 && lastSpacePosition != 0)
	                {
	                	textFromSpaceAdjustment = textThatCanFit.substring(lastSpacePosition, textThatCanFit.length);
	                	remainingText = textFromSpaceAdjustment + remainingText
	                	textThatCanFit = textThatCanFit.substring(0, lastSpacePosition);
	                }
	            	
	            	availableChars -= textThatCanFit.length; //integer
	            	if (availableChars < 0)
	            	{
	            		availableChars = 0;
	            	}
	            	
	            	remainingText = additionalDescriptionText.substring(textThatCanFit.length);
	            	
	            	if(remainingText.length > 0)
	            	{
	            		textThatCanFit += continuedSymbol;
	            	}
	            }
	            
	            table += getHtmlFor("itemDescription", textThatCanFit, assetName, priceDetails, shouldDisplayPrice, classCodeText, itemNameText);
	            
	            while (remainingText.length > 0)
	            {
	            	table += "<tr>" +
                    "<td class='top-bordered' colspan='4' align='right'><b>Carry Over:</b></td>" +
                    "<td class='top-bordered' align='right'>" + addCommas(carryOver.toFixed(2)) + "</td>" +
                    "</tr>";
	            	table += "</tbody></table>";
	            	table += "<pbr/>";
	            	table += "<table>" +
	            	"<tr>" +
                    "<td colspan='4' align='right'><b>Carry Over:</b></td>" +
                    "<td align='right'>" + addCommas(carryOver.toFixed(2)) + "</td>" +
                    "</tr>" +
                    "</table>";
	            	table += getTableHeader();

            		availableChars = CHAR_LIMIT_PER_PAGE;	
 	                
 	               var finIndex = 0;
	            	if (remainingText.length < availableChars){
	            		finIndex = remainingText.length;
	            	}
	            	else
	            	{
	            		finIndex = availableChars;
	            	}
 	                
	                textThatCanFit = remainingText.substring(0, finIndex);
	                
	                var lastSpacePosition = textThatCanFit.lastIndexOf(" ", textThatCanFit.length)
	                
	                remainingText = remainingText.substring(textThatCanFit.length);
	                
	                if(lastSpacePosition != -1 && lastSpacePosition != 0 && remainingText.length > 0) //and remainingText.length > 0 ???
	                {
	                	textFromSpaceAdjustment = textThatCanFit.substring(lastSpacePosition, textThatCanFit.length);
	                	textThatCanFit = textThatCanFit.substring(0, lastSpacePosition);
	                }

	                if(remainingText.length > 0)
	                {
	                	textThatCanFit += continuedSymbol;
	                }
	                
	                table += getHtmlFor("itemDescription", textThatCanFit, assetName, priceDetails, shouldDisplayPrice, classCodeText, itemNameText);
	                
	                if(remainingText.length > 0)
	            	{
	                	remainingText = textFromSpaceAdjustment + "" + remainingText;
	                	table += "</tbody></table></div>";
	                	table += getCarryOverHtmlBottom(carryOver);
	                    table += getCarryOverHtmlTop(carryOver);
	            		availableChars = CHAR_LIMIT_PER_PAGE;
	            		descriptionConsumedMultiplePages = true;
	            	}
	            	else
	            	{
	            		availableChars -= textThatCanFit.length;
	            		descriptionConsumedMultiplePages = false;
	            	}

	                textFromSpaceAdjustment = "";
	            }
	            

                textFromSpaceAdjustment = "";
            }
            else
            {
            	//exempted items - Rod
            	table += "<tr>" +
                "<td class='desc'><p align='left'>" + headerDescription + "</p><p></p></td>" +
                "<td></td>" +
                "<td></td>" +
                "<td></td>" +
                "</tr>";
            	itemsAdded += 1;
            }
            availableChars -= ADDITIONAL_SPACE_PER_LINEITEM
        }
        else   //if no open?closed? line items - Rod
        {
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
        
    }
//    nlapiLogExecution('debug', 'table contents', table);
	var isVisible = false;
    recoAppr = record.getFieldValue("custbody_mcc_recommending_approval"), recoApprSig;
//    recoAppr = recoAppr ? nlapiLookupField('employee', record.getFieldValue("custbody_mcc_recommending_approval"), 'entityid') : "";
   if(recoAppr) {
//        recoApprSig = parseInt(nlapiLookupField('employee', record.getFieldValue("custbody_mcc_recommending_approval"), "image"));
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
    
    //TODO remove after debugging - Rod
//  debugRecord = nlapiCreateRecord('customrecord_rodmardebugger');
//	debugRecord.setFieldValue("custrecord_rodmardebugger_log", html);
//	debugRecord.setFieldValue("custrecord_rodmardebugger_log_title", "full html");
//	debugRecId = nlapiSubmitRecord(debugRecord);
//	nlapiLogExecution("DEBUG", "debugRecId : ", debugRecId);
    
	var pdf = nlapiXMLToPDF(html);
    response.setContentType('PDF', 'PurchaseOrderPrintout.pdf', 'inline');
    response.write(pdf.getValue()); 
}


/**
 * Gets the Carry Over Html for bottom
 * @param {Number} carryOver
 * @returns {String} table
 */
function getCarryOverHtmlBottom(carryOver)
{
	var table = "";
	try
	{
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
	}
	catch(e)
	{
		nlapiLogExecution('DEBUG','Error in function: getCarryOverHtmlBottom', e.message);
	}
	
	return table;
}

/**
 * Gets the Carry Over Html for top
 * @param param {Number} carryOver
 * @returns {String} table
 */
function getCarryOverHtmlTop(carryOver)
{
	var table = "";
	try
	{
		table += getTableHeader();
	    table += "<tr>" +
	    	"<td class='desc'></td>" + 
	    	"<td class='qty'></td>" +
	        "<td class='unit_price' align='right'><b>Carry Over: </b></td>" +
	        "<td class='total' align='right'><p>" + addCommas(carryOver.toFixed(2)) + "</p><p></p></td>" +
	        "</tr>";
	}
	catch(e)
	{
		nlapiLogExecution('DEBUG','Error in function: getCarryOverHtmlTop', e.message);
	}
	
	return table;
}

/**
 * Constructs and gets the HTML
 * @param {String} type - criteria to what kind of HTML to construct
 * @param {String} text - the main text to display
 * @param {String} assetName - the assetName
 * @param {Object} other - contains the price related details 
 * @param {Boolean} shouldDisplayPrice - to determine if the price should be displayed
 * @param {classCodeText} - the class code
 * @param {itemNameText} - the item name
 * @returns {String}
 */
function getHtmlFor(type, text, assetName, other, shouldDisplayPrice, classCodeText, itemNameText)
{
	var table = "";
	try
	{
		switch(type)
		{
			case "assetName":
					table +=
		                  "<tr tcfor='assetName'>" +
		                    "<td class='desc'>" +
		                      "<p align='left'>"  + text + "</p>" +
		                    "</td>" +
		                    "<td colspan='3'></td>" +
		                  "</tr>";
				break;
					
			case "itemName":
				table +=
	                  "<tr tcfor='itemNameAndClassCode'>" +
	                    "<td class='desc'>";
	                      assetName ? table+="<p align='left' padding-left='0.25cm'>" : table+="<p align='left'>";
	                      table+= itemNameText + "</p>";
	                      assetName ? table+="<p padding-left='0.50cm'>" : table+="<p padding-left='0.25cm'>";
	                      table+= "<b>Class: </b>" + classCodeText + "</p>";
	             table +=
	                    "</td>";
	             
	             //To make up for the indention - Rod
	             assetName ? availableChars += 6 : availableChars += 3;
	                      
		        if(shouldDisplayPrice == true)
	            {
		        	shouldDisplayPrice = false;
	                table +=  
		                    "<td class='qty'>" + other.qty + " " + other.units  + "</td>" +
		                    "<td class='unit_price'>" + addCommas((other.rate * (1 + other.taxRate)).toFixed(2)) + "</td>" +
		                    "<td class='total'>" + addCommas(other.grossamt.toFixed(2)) + "</td>";
	            }
								
					table +=
						"</tr>";
				break;
					
					
			case "itemDescription":
				table +=
	                  "<tr tcfor='itemNameAndDescription'>" +
	                    "<td class='desc'>";
	                      assetName ? table+="<p align='justify' padding-left='0.25cm'>" : table+="<p align='justify'>";
	                      table+= text + "</p>";
	             table +=

		                "<p></p>" +
	                    "</td>" +
	                  "</tr>";
	             
	             //To make up for the indention - Rod
	             assetName ? availableChars += 6 : availableChars += 3;
	             
			break;
		}
	}
	catch(e)
	{
		nlapiLogExecution("DEBUG", "Error in function: getHtmlFor", e.message);
	}
	
	return table;
}