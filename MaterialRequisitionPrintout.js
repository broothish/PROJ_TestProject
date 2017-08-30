/**
 * Script Name / Script File : [nr] MaterialRequisitionPrintout / MaterialRequisitionPrintout.js
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
 * Notes:			customscript_materialrequisition
 * 					customdeploy_materialrequisition
 * 
 * Project:
 * 
 * Version:			1.0.0 - Date - Initial Release - Nowe
 * 					1.1.0 - 08/29/2017 - ChangeRequest# - ProjectPhase#
 * 							- Fixed PO Printout Issues - Rodmar
 * 					1.1.1 - Rodmar
 * 					1.1.2 - Flag to not display amount and total for Description Items
 * 
 * Libraries: 	mgwd_util.js
 * 				moment.min.js
 * 
 */


/*
* @Author: nowee
* @Date:   2016-03-30 12:00:00
* @Last Modified by:   nowee
* @Last Modified time: 2016-05-16 23:07:32
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
var CHAR_LIMIT_PER_PAGE = 1100;
/*
 * tracks down the available character for a description column in a table
 */
var availableChars = 1100;
/*
 * the remaining text from the description that was cut and is to be displayed in the next page
 */
var remainingText = "";
/*
 * the marker for the <i>continued<i> text
 */
var CONTINUED_SYMBOL = "</p><p align='center'><i>[***continued***]</i>";

/**
 * Generates opening set for table template
 * @return {[type]} [description]
 */
function getTableHeader() {
    return  '<table page-break-inside="avoid" border="2px solid #808080">' +
            '<thead>' +
                '<tr>' +
                    '<td align="center" class="bottom-bordered" width="300px">' +
                        '<p class="bold uppercase">description</p>' +
                    '</td>' +
                    '<td align="center" class="left-bordered bottom-bordered" width="50px">' +
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
 * Generates a material requisiton printout
 * @param  {nlobjRequest} request  netsuite request object
 * @param  {nlobjResponse} response netsuite response object
 * @return {[type]}          [description]
 */
function suitelet(request, response) {
    nlapiLogExecution("debug", "due date", "deliveryDate");
    var record = nlapiLoadRecord(request.getParameter("recordType"), request.getParameter("recordId")),
        project = record.getFieldText("class"),
        warehouse = record.getFieldText("location"),
        subproject = record.getFieldText("custbody_mcc_subproject"),
        subprojectLength  = subproject.split(":").length,
        mrNo = record.getFieldValue("tranid"),
        date = record.getFieldValue("trandate"),
        deliveryDate = record.getFieldValue("duedate"),
        customForm = parseInt(record.getFieldValue('customform')),
        currency = record.getFieldValue("currencysymbol");
    
    //1.1.1 - 10_Rodmar
    if(customForm == 120)
    {
    	
    }
    else
    {
    	CHAR_LIMIT_PER_PAGE += 450;
    	availableChars += 450;
    }
    
    date = moment(date).format("MMMM DD, YYYY");
    deliveryDate = (deliveryDate) ? 
        moment(deliveryDate).format("MMMM DD, YYYY") : '';
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
        additionalDescription = "", 
        hasGrandTotal = false;
    for (var c = 1; c <= lineitems; c++) {
        var currentItem = record.getLineItemValue("item", "item", c);
        currentItem = parseInt(currentItem);
        
        var shouldDisplayAmount = true;
        var itemType = nlapiLookupField("item", currentItem, "type");
        nlapiLogExecution("DEBUG", "ROD : itemType", itemType);
        
        //1.1.2 - Rodmar
        if(itemType == "Description")
        {
        	shouldDisplayAmount = false;
        }
        
        /*
         * Sandbox Version
         */
        if (currentItem == 831) {
            isIndedted = true;
            headerDescription = record.getLineItemValue("item", "custcol_mcc_custdesc", c);
        } else {
            isIndedted = false;
        }
        additionalDescription = (currentItem == 835) ? "" : 
            record.getLineItemValue("item", "custcol_mcc_custdesc", c);
        itemName = (currentItem == 835) ? record.getLineItemValue("item", "custcol_mcc_custdesc", c) :
            record.getLineItemValue("item", "item_display", c);
        
        
        /*
         * Production Version
         */
        /*if (currentItem == 831) {
            isIndedted = true;
            headerDescription = record.getLineItemValue("item", "description", c);
        } else {
            isIndedted = false;
        }
        additionalDescription = (currentItem == 835) ? "" : 
            record.getLineItemValue("item", "description", c);
        itemName = (currentItem == 835) ? record.getLineItemValue("item", "description", c) :
            record.getLineItemValue("item", "item_display", c);*/
        
        
        
        
        
        itemCode = (itemName) ? itemName.substr(0, itemName.indexOf(" ")) : "";
        classcode = record.getLineItemText("item", "custcol_projecttask", c);
        classcode = classcode ? classcode : record.getLineItemValue("item", "custcol_classcode_display", c);
        classcode = classcode ? classcode : "";
        // classcode = (classcode) ? classcode.substr(classcode.indexOf(" ")) : "";
        assetName = record.getLineItemText("item", "custcol_mcc_asset_name", c);
        assetName = (assetName) ? assetName.substr(assetName.indexOf(" ")) : ""
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
        
        if (currentItem != 831) {
        	
        	table += "<tr>" +
            "<td>";
        	
            if(!(currentItem == 835 || currentItem == 13132)){
            	table +=
                "<p align='left'>" + itemName + "</p>";
                
                descriptionIsIndented = true;
                availableChars -= getAdjustedSpaceConsumption(itemName.length, 0, itemName)
                availableChars -= AVERAGE_CHARS_PER_LINE;
//                availableChars -= AVERAGE_CHARS_PER_LINE;
            }
           
          //additional description - 10_Rod
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
        
          	table += getHtmlFor("htmlForDescription", textThatCanFit, priceDetails, shouldDisplayClass, classcode, assetName, assetCode, plateNo, descriptionIsIndented, shouldDisplayAmount);
        
                	
          	while (remainingText.length > 0)
            {
          		availableChars = CHAR_LIMIT_PER_PAGE;
          		
          		table += getCarryOverHtmlBottom(carryOver);
          		table += getCarryOverHtmlTop(carryOver);
          		table += getTableHeader();
          		availableChars -= AVERAGE_CHARS_PER_LINE;
                  	
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
                table += getHtmlFor("htmlForDescription", textThatCanFit, priceDetails, shouldDisplayClass, classcode, assetName, assetCode, plateNo, descriptionIsIndented, shouldDisplayAmount);
                
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
                
            itemsAdded += 1;
            
        } else {
            table += "<tr>" +
                "<td><p align='left'>" + headerDescription + "</p></td>" +
                "<td class='left-bordered'></td>" +
                "<td class='left-bordered'></td>" +
                "<td class='left-bordered'></td>" +
            "</tr>";
            itemsAdded += 1;
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
    nlapiLogExecution("debug", "item table content", table);
    var html = nlapiLoadFile(17137).getValue();
    html = html.replace("{body}", table);
    html = html.replace("{project}", project);
    html = html.replace("{warehouse}", warehouse);
    html = html.replace("{subproject}", subproject);
    html = html.replace("{tranid}", mrNo);
    html = html.replace("{trandate}", date);
    html = html.replace("{duedate}", deliveryDate);
    html = html.replace("{currency}", currency);
    html = html.replace("{prepby}", record.getFieldText("entity"));
    html = html.replace("{recommending}", record.getFieldText("custbody_mcc_next_approver_pm"));
    html = html.replace("{approvedby}", record.getFieldText("custbody_mcc_next_approver_am"));

    if (customForm == 120) {
        html = html.replace('header-height="22%"', "header-height='30%'");
        html = html.replace("{celdlefttable}", "<tr>" +
            "<td padding-top='10px'><b>Anticipatory:</b></td>" +
            "<td padding-top='10px' class='underlined-cell'>" +
                "<p align='left'>" +
                    record.getFieldValue('custbody_mccanticipatorynobf_') + 
                 "</p></td>" +
            "</tr>" +
            "<tr>" +
                "<td padding-top='10px'><p class='bold' align='left'>Quotation #:</p></td>" +
                "<td padding-top='10px' class='underlined-cell'>" +
                    "<p align='left'>" +
                        record.getFieldValue('custbody_mcc_quotation_reference') + 
                     "</p></td>" + 
             
            "</tr>");
        html = html.replace("{celdrighttable}", "<tr>" +
            "<td padding-top='10px'><b>RTP Ref:</b></td>" +
            "<td padding-top='10px' class='underlined-cell'>" +
                "<p align='left'>" +
                    record.getFieldValue('custbody_mcc_rtp_ref') + 
                 "</p></td>" + "</tr><tr>" +
                  "<td padding-top='10px'><b>MRIF No:</b></td>" +
            "<td padding-top='10px' class='underlined-cell'>" +
                "<p align='left'>" +
                    record.getFieldText('custbody_celd_mrifno') + 
                 "</p></td>" + "</tr><tr>" +
                  "<td padding-top='10px'><b>Work Order No:</b></td>" +
            "<td padding-top='10px' class='underlined-cell'>" +
                "<p align='left'>" +
                    record.getFieldText('custbody_celd_workorder') + 
                 "</p></td>" +
             
            "</tr>");
    } else {
        nlapiLogExecution("debug", "form type", "NOT CELD");
        nlapiLogExecution("debug", "html", html);
        
    }
    html = html.replace("{celdlefttable}", "");
    html = html.replace("{celdrighttable}", "");

    //================================= Added Signatures ==================================================================
    var SIGNATURE_IMG = [];
    status = record.getFieldValue('custbody_mcc_custom_approval_status') == 3; // Approved
    ab = record.getFieldValue('entity');
    rb = record.getFieldValue('custbody_mcc_next_approver_pm');
    pb = record.getFieldValue('custbody_mcc_next_approver_am');
    SIGNATURE_IMG[0] = ab ? nlapiLookupField('employee', ab, 'image') : '';
    SIGNATURE_IMG[1] = rb ? nlapiLookupField('employee', rb, 'image') : '';
    SIGNATURE_IMG[2] = pb ? nlapiLookupField('employee', pb, 'image') : '';
    preparedBy = SIGNATURE_IMG[0] ? "<img src='https://system.na2.netsuite.com"+nlapiLoadFile(SIGNATURE_IMG[0]).getURL()+"' width='100' height='50'/>" : '';
    if(status){
        recommendingApproval = (SIGNATURE_IMG[1]) ? "<img src='https://system.na2.netsuite.com"+nlapiLoadFile(SIGNATURE_IMG[1]).getURL()+"' width='100' height='50'/>" : '';
        approvedBy = (SIGNATURE_IMG[2]) ? "<img src='https://system.na2.netsuite.com"+nlapiLoadFile(SIGNATURE_IMG[2]).getURL()+"' width='100' height='50'/>" : '';
    }else{
        recommendingApproval = '';
        approvedBy = '';
    }
    nlapiLogExecution('debug', 'preparedBy', preparedBy);
    nlapiLogExecution('debug', 'recommendingApproval', recommendingApproval);
    nlapiLogExecution('debug', 'approvedBy', approvedBy);
     //====================================================================================================================

    html = html.replace("{preparedBy}", preparedBy);
    html = html.replace("{recommendingApproval}", recommendingApproval);
    html = html.replace("{approvedBy}", approvedBy);
    html = html.replace(/&/g, "&amp;");
    html = html.replace(/null/g, "");

//  TODO remove after debugging - Rod
//	debugRecord = nlapiCreateRecord('customrecord_rodmardebugger');
//	debugRecord.setFieldValue("custrecord_rodmardebugger_log", html);
//	debugRecord.setFieldValue("custrecord_rodmardebugger_log_title", "full html");
//	debugRecId = nlapiSubmitRecord(debugRecord);
//	nlapiLogExecution("DEBUG", "debugRecId : ", debugRecId);
    
    
    var pdf = nlapiXMLToPDF(html);
    pdf = pdf.getValue();
    response.setContentType("pdf", "MaterialRequisition.pdf", "inline");
    response.write(pdf);
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
function getHtmlFor(type, displayableText, priceDetails, shouldDisplayClass, classcode, assetName, assetCode, descriptionIsIndented, shouldDisplayAmount)
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
		                
		                if(assetName)
		                {
		                	availableChars -= getAdjustedSpaceConsumption(("For:" + assetName + " " + assetCode + " :: " + plateNo).length, 1, "For:" + assetName + " " + assetCode + " :: " + plateNo);
		                }
		                if(classcode)
		                {
		                	availableChars -= getAdjustedSpaceConsumption(("Class:"  + " " + classcode).length, 1, classcode);
		                }
		                
					}
					else {
		                table += "<p align='left' padding-left='30px' top='-10'><b>Class: </b>" + classcode + "</p>";
		                
		                if(classcode)
		                {
		                	availableChars -= getAdjustedSpaceConsumption(("Class:"  + " " + classcode).length, 1, classcode);
		                }
		                
		            }
					
					shouldDisplayClass == false;
				}
				
				table += "</td>";
				
				if(shouldDisplayPrice)
				{
					
					var quantityAndUnits = "";
					var rate = "";
					var grossamt = "";
					
					if(shouldDisplayAmount == true)
					{
						quantityAndUnits = priceDetails.qty + " " + priceDetails.units || "";
						rate = addCommas((priceDetails.rate).toFixed(2));
						grossamt = addCommas(priceDetails.grossamt.toFixed(2));
					}
					
					table += 
						"<td vertical-align='middle' align='center' class='left-bordered'>" +
						quantityAndUnits +
	                    "</td>" +
	                    "<td vertical-align='middle' align='right' class='left-bordered'>" +
	                    rate + 
	                    "</td>" +
	                    "<td vertical-align='middle' align='right' class='left-bordered'>" +
	                    grossamt;
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