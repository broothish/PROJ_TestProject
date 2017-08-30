/**
 * Script Name / Script File : [nr] JobRequisitionPrintout / JobRequisitionPrintout.js
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
 * Notes:			customscript_jobrequisition
 * 					customdeploy_jobrequisition
 * 
 * Project:
 * 
 * Version:			1.0.0 - Date - Initial Release - Nowe
 * 					1.1.0 - 08/30/2017 - ChangeRequest# - ProjectPhase#
 * 							- Fixed PO Printout Issues - Rodmar
 * 
 * Libraries: 	mgwd_util.js
 * 				moment.min.js
 * 
 */

/*
 * to account for the space consumed by tabs
 */
var SPACE_PER_TAB = 3; 
/*
 * the average number of character that can fit on a line in the description column
 */
var AVERAGE_CHARS_PER_LINE = 50;
/*
 * the character limit for the description column per table or page
 */
var CHAR_LIMIT_PER_PAGE = 1200;
/*
 * tracks down the available character for a description column in a table
 */
var availableChars = 1200;
/*
 * the remaining text from the description that was cut and is to be displayed in the next page
 */
var remainingText = "";
/*
 * the marker for the <i>continued<i> text
 */
var CONTINUED_SYMBOL = "</p><p align='center'><i>[***continued***]</i>";

/*
* @Author: nowee
* @Date:   2016-03-30 11:52:17
* @Last Modified by:   nowee
* @Last Modified time: 2016-05-13 13:21:03
*/

function getTableHeader() {
    return '<table page-break-inside="avoid" border="2px solid #808080">' +
            '<thead>' +
                '<tr>' +
                    '<td align="center" class="bottom-bordered" width="300px">' +
                        '<p class="bold uppercase">description</p>' +
                    '</td>' +
                    '<td align="center" class="left-bordered bottom-bordered" width="100px">' +         // changed width from 50px to 100px
                        '<p class="bold uppercase">qty</p>' +
                    '</td>' +
                    // '<td align="center" class="left-bordered bottom-bordered" width="50px">' +
                        // '<p class="bold uppercase">type</p>' +
                    // '</td>' +
                    '<td align="center" class="left-bordered bottom-bordered">' +
                        '<p class="bold uppercase">unit price</p>' +
                    '</td>' +
                    '<td align="center" class="left-bordered bottom-bordered">' +
                        '<p class="bold uppercase">total</p>' +
                    '</td>' +
                '</tr>' +
            '</thead>' +
            '<tbody>';
}

/**
 * Creates a printout for the following custom forms
 * 1) BP Job Order Requisition
 * 2) CELD Job Order Requisition
 * 3) PRJ Job Requisition
 * @param  {nlobjRequest} request  netsuite nlobjRequest object
 * @param  {nlobjResponse} response netsuite nlobjResponse object
 * @return {[type]}          [description]
 */
function suitelet(request, response) {
    var record = nlapiLoadRecord(request.getParameter("recordType"), request.getParameter("recordId")),
        project = record.getFieldText("class"),
        warehouse = record.getFieldText("location"),
        subproject = record.getFieldText("custbody_mcc_subproject"),
        subprojectLength  = subproject.split(":").length,
        mrNo = record.getFieldValue("tranid"),
        date = record.getFieldValue("duedate"),
        deliveryDate = record.getFieldValue("duedate"),
        currency = record.getFieldValue("currencysymbol"),
        customForm = parseInt(record.getFieldValue("customform"));
    date = moment(date).format("MMMM DD, YYYY");
    deliveryDate = moment(date).format("MMMM DD, YYYY");
    if (subprojectLength > 0) {
        subproject = subproject.split(":")[subprojectLength - 1];
    }
    var lineitems = record.getLineItemCount("item");
    var carryOver = 0.00,
        grandTotal = 0.00,
        displayName = "",
        description = "",
        classcode = "",
        currentItem = "",
        units = "",
        quantity = 0.00,
        rate = 0.00,
        total = 0.00,
        itemCounter = 0,
        itemsAdded = 0,
        itemType = "",
        table = getTableHeader(),
        assetName = "",
        assetCode = "",
        brand = "",
        nextItem = "",
        additionalDescription = "", hasGrandTotal = false;
        var chars = 0;
    for (var c = 1; c <= lineitems; c++) {
        var currentItem = record.getLineItemValue("item", "item", c);
        currentItem = parseInt(currentItem);
        if (currentItem == 831) {
            isIndedted = true;
            headerDescription = record.getLineItemValue("item", "custcol_mcc_custdesc", c);
        } else {
            isIndedted = false;
        }
        additionalDescription = (currentItem == 13132) ? "" : 
            record.getLineItemValue("item", "custcol_mcc_custdesc", c);
        itemName = (currentItem == 13132) ? record.getLineItemValue("item", "custcol_mcc_custdesc", c) :
            record.getLineItemValue("item", "item_display", c);
        itemCode = (itemName) ? itemName.substr(0, itemName.indexOf(" ")) : "";
        classcode = record.getLineItemText("item", "custcol_projecttask", c);
        classcode = classcode ? classcode : record.getLineItemValue("item", "custcol_classcode_display", c);
        classcode = classcode ? classcode : "";
        // classcode = (classcode) ? classcode.substr(classcode.indexOf(" ")) : "";
        assetName = record.getLineItemText("item", "custcol_mcc_asset_name", c);
        assetName = (assetName) ? assetName.substr(assetName.indexOf(" ")) : "";
        assetCode = (assetName) ? assetName.substr(0, assetName.indexOf(" ")) : "";
        plateNo = record.getLineItemValue("item", "custcol_mcc_asset_distinction", c);
        brand = record.getLineItemText("item", "custcol2", c);
        itemName = (brand) ? itemName + " (" + brand + ")" : itemName;
        qty = record.getLineItemValue("item", "quantity", c);
        units = record.getLineItemValue("item", "units_display", c);
        rate = parseFloat(record.getLineItemValue("item", "estimatedrate", c));
        rate = isNaN(rate) ? 0.00 : rate;
        grossamt = parseFloat(record.getLineItemValue("item", "estimatedamount", c));
        grossamt = isNaN(grossamt) ? 0.00 : grossamt;
        var top = -10;
        
        
        var textThatCanFit = "";
        var textFromSpaceAdjustment = "";
        shouldDisplayPrice = true;
        var shouldDisplayClass = false;
        var descriptionIsIndented = false; //global?
        
        additionalDescription ? additionalDescription = additionalDescription : additionalDescription = "";
        
      //if available chars is too short already, break the page
        if(availableChars < AVERAGE_CHARS_PER_LINE)
        {
        	table += getCarryOverHtmlBottom(carryOver);
        	table += getCarryOverHtmlTop(carryOver);
        	table += getTableHeader();
        	availableChars = CHAR_LIMIT_PER_PAGE;
        }
        
        carryOver += grossamt;
        grandTotal += grossamt;
        
        var priceDetails = {qty: qty, units: units, rate : rate, grossamt : grossamt};
        
		if (currentItem != 831)
		{
			table += "<tr>" +
			"<td>";
			
			if(currentItem == 835 || currentItem == 13132)
			{
				if(currentItem!=835)
				{
					table +=
		                "<p align='left'>" + itemName + "</p>";
				}
                
	                descriptionIsIndented = true;
	                availableChars -= getAdjustedSpaceConsumption(itemName.length, 0, itemName)
	                availableChars -= AVERAGE_CHARS_PER_LINE;
	                availableChars -= AVERAGE_CHARS_PER_LINE;
			}
			else
			{
				table +=
	                "<p align='left'>" + itemName + "</p>";
			}
			
			if(additionalDescription.length < availableChars)
            {
          	  textThatCanFit = additionalDescription;
          	  remainingText = "";
          	  shouldDisplayClass = true;
            }
        	else
            {
          	  shouldDisplayClass = false;
          	  	var finIndex = 0;
            		if (additionalDescription.length < availableChars){
            			finIndex = additionalDescription.length;
            		}
            		else
            		{
            			finIndex = availableChars;
            		}
            	
            		textThatCanFit = additionalDescription.substring(0, finIndex);
            	
            		var lastSpacePosition = textThatCanFit.lastIndexOf(" ", textThatCanFit.length)
	                
  	                if(lastSpacePosition != -1 && lastSpacePosition != 0)
  	                {
  	                	textFromSpaceAdjustment = textThatCanFit.substring(lastSpacePosition, textThatCanFit.length);
  	                	remainingText = textFromSpaceAdjustment + remainingText
  	                	textThatCanFit = textThatCanFit.substring(0, lastSpacePosition);
  	                }

            }	
            availableChars -= getAdjustedSpaceConsumption(textThatCanFit.length, 0, textThatCanFit);
          	if (availableChars < 0)
          	{
          		availableChars = 0;
          	}
          	
          	remainingText = additionalDescription.substring(textThatCanFit.length);
          	
          	if(remainingText.length > 0)
          	{
          		textThatCanFit += CONTINUED_SYMBOL;
          		shouldDisplayClass = false;
          	}
          	else
          	{
          		shouldDisplayClass = true;
          	}
        
          	table += getHtmlFor("htmlForDescription", textThatCanFit, priceDetails, shouldDisplayClass, classcode, assetName, assetCode, plateNo, descriptionIsIndented);
        
                	
          	while (remainingText.length > 0)
            {
          		table += getCarryOverHtmlBottom(carryOver);
          		table += getCarryOverHtmlTop(carryOver);
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
                	textThatCanFit += CONTINUED_SYMBOL;
                	shouldDisplayClass = false;
                }
                else
                {
                	shouldDisplayClass = true;
                }
                
               table += "<tr><td>";
                table += getHtmlFor("htmlForDescription", textThatCanFit, priceDetails, shouldDisplayClass, classcode, assetName, assetCode, plateNo, descriptionIsIndented);
                
                if(remainingText.length > 0)
            	{
                	remainingText = textFromSpaceAdjustment + "" + remainingText;
            	}
            	else
            	{
            		availableChars -= getAdjustedSpaceConsumption(textThatCanFit.length, 0, textThatCanFit);
            		shouldDisplayClass = true;
            	}

                textFromSpaceAdjustment = "";
            }  
                
            availableChars -= AVERAGE_CHARS_PER_LINE;
            availableChars -= AVERAGE_CHARS_PER_LINE;
            
            
		}
		else {
            table += "<tr>" +
                "<td><p align='left'>" + headerDescription + "</p></td>" +
                "<td class='left-bordered'></td>" +
                "<td class='left-bordered'></td>" +
                "<td class='left-bordered'></td>" +
            "</tr>";
        }
        if (c == lineitems) {
            if (!hasGrandTotal) {
                table += "<tr>" +
                "<td class='top-bordered' colspan='3' align='right'><b>Grand Total:</b></td>" +
                "<td class='top-bordered left-bordered' align='right'>" + addCommas(carryOver.toFixed(2)) + "</td>" +
                "</tr>";
            }
            table += "</tbody></table>";
        }
    }
    var endingTables = "";
    var inclusions = record.getFieldValue('custbody_mcc_job_inclusions');
    if (inclusions) {
        endingTables += "<table width='100%' margin-top='20px'>" +
            "<tr>" +
                "<td border='2px solid #808080' padding='10px'>" +
                    "<p align='left'>" + 
                        wordWrap(inclusions) + 
                    "</p>" +
                "</td>" +
            "</tr>" +
        "</table>";
    }
    var exclusions = record.getFieldValue('custbody_mcc_job_exclusions');
    if (exclusions) {
        endingTables +="<table width='100%' margin-top='20px'>" +
            "<tr>" +
                "<td border='2px solid #808080' padding='10px'>" +
                    "<p align='left'>" + 
                        wordWrap(exclusions) + 
                    "</p>" +
                "</td>" +
            "</tr>" +
        "</table>";
    }
    endingTables += "<table border='2px solid #808080' width='100%' margin-top='20px'>" +
            "<tr>" +
                "<td>" +
                    "<p class='uppercase'>work schedule</p>" +
                    "<p class='uppercase'>start date: {start}<br/>" +
                    "completion date: {completion}<br/>" +
                    "<span class='uppercase'>{chargesubcon}</span><br/>" +
                    "<span class='uppercase'>{linkedorders}</span><br/>" +
                    "<b class='uppercase'>{quotref}</b><br/>" +
                    "</p>" +
                "</td>" +
            "</tr>" +
            "<tr>" +
                "<td border-top='2px solid #808080' align='right'>"  +
                    "<p align='right'><b>Grand Total: " + addCommas(grandTotal.toFixed(2)) + "</b></p></td>" +
            "</tr>" +
        "</table>";
    var linkedOrders = getLinkedOrders(record);

    var chargeToSubcon = record.getFieldTexts("custbody_mcc_charge_to_subcon");
    if (chargeToSubcon) {
        var holder = '';
        chargeToSubcon.forEach(function(stringComponent, index, arr) {
            if (index != arr.length) {
                holder += stringComponent + ', ';
            } else {
                holder += stringComponent;
            }
        });
        chargeToSubcon = holder;
    }
     nlapiLogExecution('debug', 'subcon field value', JSON.stringify(chargeToSubcon));
    // nlapiLogExecution('debug', 'subcon field value', chargeToSubcon.toString());
    var quotRef = record.getFieldValue("custbody_mcc_quotation_reference");
    quotRef = (quotRef) ? quotRef : "";
    chargeToSubcon = (chargeToSubcon) ? ("charge to:" + chargeToSubcon) : "";
    endingTables = endingTables.replace("{start}", record.getFieldValue("custbody_mcc_work_start_date"));
    endingTables = endingTables.replace("{completion}", record.getFieldValue("custbody_mcc_work_end_date"));
    endingTables = endingTables.replace("{chargesubcon}", chargeToSubcon);
    endingTables = endingTables.replace("{linkedorders}", linkedOrders);
    endingTables = endingTables.replace("{quotref}", quotRef);
     nlapiLogExecution("debug", "TABLE CONTENT", table);
     nlapiLogExecution('ERROR','SIGNATORIES',record.getFieldValue("custbody_mcc_prepared_by") +" : "+record.getFieldValue("custbody_mcc_next_approver_pm")+ " : "+ record.getFieldValue("custbody_mcc_next_approver_am"));
    var ent = record.getFieldValue('entity');
    var appram = record.getFieldValue('custbody_mcc_next_approver_am');
    var apprpm = record.getFieldValue('custbody_mcc_next_approver_pm');
    var frimgent = '';
    var frimgam = '';
    var frimgpm = '';
    var imgent = '';
    var imgam = '';
    var imgpm = '';
    if(record.getFieldValue('custbody_mcc_custom_approval_status') == 3){
        if(ent){
            nlapiLogExecution('ERROR','FLAG','1');
            frimgent = nlapiLookupField('employee',ent,'image');
            nlapiLogExecution('ERROR','FLAG','2');
            if(frimgent){
                imgent = '<img src="'+ nlapiLoadFile(frimgent).getURL()+'" width="100px" height="50px" align="center"></img>';
            }
        }
        if(appram){
            nlapiLogExecution('ERROR','FLAG','3');
            frimgam = nlapiLookupField('employee', appram, 'image');
            nlapiLogExecution('ERROR','FLAG','4');
            if(frimgam){
                imgam = '<img src="'+ nlapiLoadFile(frimgam).getURL()+'" width="100px" height="50px" align="center"></img>';
            }
        }
        if(apprpm){
            nlapiLogExecution('ERROR','FLAG','4');
            frimgpm = nlapiLookupField('employee', apprpm, 'image');
            nlapiLogExecution('ERROR','FLAG','5');
            if(frimgpm){
                imgpm = '<img src="'+ nlapiLoadFile(frimgpm).getURL() +'" width="100px" height="50px" align="center"></img>';
            }
        }
    }

    var html = nlapiLoadFile(1011).getValue();
    nlapiLogExecution('ERROR','FLAG',imgpm + " : " + imgam + " : " + imgent);
    html = html.replace("{body}", table);
    html = html.replace("{end}", endingTables);
    html = html.replace("{project}", project);
    html = html.replace("{warehouse}", warehouse);
    html = html.replace("{subproject}", subproject);
    html = html.replace("{tranid}", mrNo.substr(3));
    html = html.replace("{trandate}", date);
    html = html.replace("{duedate}", deliveryDate);
    html = html.replace("{currency}", currency);
    html = html.replace("{projectaddress}", record.getFieldValue("custbody_mcc_project_address"));
    html = html.replace("{prepby}", record.getFieldValue("custbody_mcc_prepared_by"));
    html = html.replace("{recommending}", record.getFieldText("custbody_mcc_next_approver_pm"));
    html = html.replace("{approvedby}", record.getFieldText("custbody_mcc_next_approver_am"));
    html = html.replace("{prepbyimg}", imgent);
    html = html.replace("{recapp}", imgpm);
    html = html.replace("{apprvby}", imgam);

    nlapiLogExecution('ERROR','FLAG','7');
    if (customForm == 124) {
        html = html.replace("{celdquote}", 
            "<p class='uppercase bold'>work order #:</p>" + "<p>" +
            record.getFieldText("custbody_celd_workorder") + "</p>" +
            "<p class='uppercase bold'>quotation #:</p>" +
            "<p>"+ record.getFieldValue("custbody_mcc_quotation_reference") 
                            + "</p>");
    } else {
        html = html.replace("{celdquote}", "");
    }
    nlapiLogExecution('ERROR','FLAG','8');
    html = html.replace(/&/g, "&amp;");
    html = html.replace(/null/g, "");
    var pdf = nlapiXMLToPDF(html);
    pdf = pdf.getValue();
    response.setContentType("pdf", "MaterialRequisition.pdf", "inline");
    response.write(pdf);
}

/**
 * Retrieves all linked orders from the line items
 * @param  {nlobjRecord} record [description]
 * @return {[type]}        [description]
 */
function getLinkedOrders(record) {
    //linkedorder
    var lineitems = record.getLineItemCount("item");
    var linkedOrders = "",
        orders = [];
    for (var c = 1; c <= lineitems; c++) {
        var linkedOrder = record.getLineItemText("item", "linkedorder", c);
        if (orders.indexOf(linkedOrder) < 0) {
            linkedOrder = (linkedOrder) ? linkedOrder : false;
            linkedOrders += ((linkedOrder) ? linkedOrder + ", " : "");
            orders.push(linkedOrder);
        }
    }
    return linkedOrders;
}


/**
 * Gets the HTML
 * 
 * @added 1.0.1 - 10_Rodmar
 * @param {String} type
 * @param {String} displayableText
 * @param {Object} itemsDescription - encapsulated details for the line item
 * @param {Bolean} shouldDisplayPrice
 * @param {Bolean} shouldDisplayClass
 * @returns {String}
 */
function getHtmlFor(type, displayableText, priceDetails, shouldDisplayClass, classcode, assetName, assetCode, descriptionIsIndented)
{
	var table = "";
	try
	{
		switch(type)
		{
			case "htmlForDescription":
				
				if(descriptionIsIndented == true)
				{
					"<p align='justify' padding-left='20px' top='-5'>" + displayableText + "</p>";
				}
				else
				{
					table +=
		                  "<p align='justify'>"+displayableText+"</p>" ;

				}
              
				if(shouldDisplayClass)
				{
					if (assetName) {
		                table += "<p align='left' padding-left='30px' top='-10'><b>For:</b>" + assetName + " " + assetCode + " :: " + plateNo + "</p>";
		                table += "<p align='left' padding-left='30px' top='-15'><b>Class: </b>" + classcode + "</p>";
		                
		                availableChars -= getAdjustedSpaceConsumption(("For:" + assetName + " " + assetCode + " :: " + plateNo).length, 1, "For:" + assetName + " " + assetCode + " :: " + plateNo);
		                availableChars -= getAdjustedSpaceConsumption(("Class:"  + " " + classcode).length, 1, classcode);
					}
					else {
		                table += "<p align='left' padding-left='30px' top='-10'><b>Class: </b>" + classcode + "</p>";
		                
		                availableChars -= getAdjustedSpaceConsumption(("Class:"  + " " + classcode).length, 1, classcode);
		            }
					
					shouldDisplayClass == false;
				}
				
				table += "</td>";
				
				if(shouldDisplayPrice)
				{
					table += 
						"<td vertical-align='middle' align='center' class='left-bordered'>" +
	                    priceDetails.qty + " " + priceDetails.units +
	                    "</td>" +
	                    "<td vertical-align='middle' align='right' class='left-bordered'>" +
	                        addCommas((priceDetails.rate).toFixed(2)) + 
	                    "</td>" +
	                    "<td vertical-align='middle' align='right' class='left-bordered'>" +
	                        addCommas(priceDetails.grossamt.toFixed(2));
	                table +=
		                "</td>";
	                
	                shouldDisplayPrice = false;
				}
				else
				{
					table += 
						"<td vertical-align='middle' align='center' class='left-bordered'>" +
	                    "</td>" +
	                    "<td vertical-align='middle' align='right' class='left-bordered'>" +
	                    "</td>" +
	                    "<td vertical-align='middle' align='right' class='left-bordered'>";
	                table +=
		                "</td>";
				}
				
				table +=
		                "</tr>";
	            
				break;
		}
	}
	catch(e)
	{
		nlapiLogExecution("DEBUG", "Error in function: getHtmlFor", e.message);
	}
	
	return table;
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
		table += "</tbody></table>";
		table += "<table>" +
        "<tr>" +
            "<td colspan='3' align='right'><b>Carry Over:</b></td>" +
            "<td align='right'>" + addCommas(carryOver.toFixed(2)) + "</td>" +
        "</tr>" +
        "</table>";
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
		table += "<table><tr>" +
        "<td colspan='3' align='right'><b>Carry Over:</b></td>" +
        "<td align='right'>" + addCommas(carryOver.toFixed(2)) + "</td>" +
        "</tr></table>";
	}
	catch(e)
	{
		nlapiLogExecution('DEBUG','Error in function: getCarryOverHtmlTop', e.message);
	}
	
	return table;
}


/**
 * Gets the accounted space consumptions of the tabs and characters
 * 
 * @added 1.0.1 - 10_Rodmar
 * @param {Number} charLength - the number of characters
 * @param {Number} tabs - the number of tabs
 * @returns {Number}
 */
function getAdjustedSpaceConsumption(charLength, tabs, text)
{
	var adjustedSpaceConsumption = 0;
	var tabulationSpaceConsumption = 0;
	try
	{
		tabulationSpaceConsumption = ((tabs * SPACE_PER_TAB) || 0);
		adjustedSpaceConsumption = 
				((Math.ceil((charLength + tabulationSpaceConsumption)
				/ AVERAGE_CHARS_PER_LINE)
				* AVERAGE_CHARS_PER_LINE)
				|| 0);
	}
	catch(e)
	{
		nlapiLogExecution("DEBUG", "Error in function: getAdjustedSpaceConsumption", e.message);
	}
	
	return adjustedSpaceConsumption;
}