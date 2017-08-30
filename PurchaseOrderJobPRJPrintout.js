/**
 * Script Name / Script File : Purchase Order Printout(rod) / PurchaseOrderJobPRJPrintout_rodmar.js
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
 * Notes:			customscript_pojobprjprintout
 * 					customdeploy_pojobprjprintout
 * 
 * Project:
 * 
 * Version:			1.0.0 - Date - Initial Release - Nowee
 * 					1.1.0 - 08/28/2017 - ChangeRequest# - ProjectPhase#
 * 							- Fixed PO Printout Issues - 10_Rodmar
 * 					1.1.1 - 08/30/2017 - ChangeRequest# - ProjectPhase#
 * 							- Added carry over and grandtotal - 10_Rodmar
 * 
 * Libraries: 	mgwd_util.js
 * 				moment.min.js
 * 
 */


/* 
* @Author: nowee
* @Date:   2016-02-24 11:39:34
* @Last Modified by:   nowee
* @Last Modified time: 2016-05-04 13:50:41
*/

/*
 * to account for the space consumed by tabs
 */
var SPACE_PER_TAB = 3; 
/*
 * the average number of character that can fit on a line in the description column
 */
var AVERAGE_CHARS_PER_LINE = 45;
/*
 * the character limit for the description column per table or page
 */
var CHAR_LIMIT_PER_PAGE = 1450;
/*
 * tracks down the available character for a description column in a table
 */
var availableChars = 1450;
/*
 * the remaining text from the description that was cut and is to be displayed in the next page
 */
var remainingText = "";
/*
 * the marker for the <i>continued<i> text
 */
var CONTINUED_SYMBOL = "</p><p align='center'><i>[***continued***]</i>";



function buildTableSet() {
	//1.1.1 - Use page-break-inside=avoid property, instead of page-break-before='always' 10_Rodmar
    return "<table page-break-inside='avoid' class='jo-details' border='2px solid #808080'>" +
    "<thead>" +
        "<tr>" +
                "<td width='300px' class='bottom-bordered'>"+
                    "<p align='center' class='bold uppercase'>description (the job)</p>" +
                "</td>" +
                "<td width='85px' class='left-bordered bottom-bordered'>" +
                    "<p align='center' class='bold uppercase'>quantity</p>" +
                "</td>" +
                "<td width='55px' class='left-bordered bottom-bordered'>" +
                    "<p align='center' class='bold uppercase'>unit</p>" +
                "</td>" +
                "<td width='130px' class='left-bordered bottom-bordered'>" +
                    "<p align='center' class='bold uppercase'>unit price</p>" +
                "</td>" +
                "<td width='130px' class='left-bordered bottom-bordered'>" +
                    "<p align='center' class='bold uppercase'>total</p>" +
                "</td>" +
            "</tr>" +
    "</thead>" + 
    "<tbody>";
}

/**
 * Generates a printout for purchase order
 * @param  {nlobjRequest} request  netsuite request object
 * @param  {nlobjResponse} response netsuite response object
 * @return {[type]}          [description]
 */
function suitelet(request, response) {
    var record = nlapiLoadRecord(request.getParameter("recordType"), request.getParameter("recordId"));
    var lineitems = record.getLineItemCount("item");
    var items = {};
    var itemHeading = "";
    
    /* 
        Create grouping
    */
    for (var c = 1; c <= lineitems; c++) {
        if (record.getLineItemValue('item', 'isclosed', c) == 'F') {
            var grossAmt = record.getLineItemValue("item", "grossamt", c);
            var itemType = record.getLineItemValue("item", "item", c);
            itemType = parseInt(itemType);
//             nlapiLogExecution("debug", "item type", itemType);
            // if (itemType == 831) {
                var description = record.getLineItemValue("item", "custcol_mcc_custdesc", c);
                itemHeading = description;
//                nlapiLogExecution("debug", "ITEMS STRUCTURE", JSON.stringify(items));
                // nlapiLogExecution("debug", "item heading", itemHeading);
            // } else {
                // nlapiLogExecution("debug", "ITEM HEADING TO SET", itemHeading);
                if (description !== "" && !items[description]) {
                    items[description] = [];
                    itemHeading = "";
                }
            // }
        }
    }
    var lastItem;
//    nlapiLogExecution('DEBUG','ITEMS',JSON.stringify(items));
    for (var c = 1; c <= lineitems; c++) {
        if (record.getLineItemValue('item', 'isclosed', c) == 'F') {
            var grossAmt = record.getLineItemValue("item", "grossamt", c);
            var itemType = record.getLineItemValue("item", "item", c);
            itemType = parseInt(itemType);
            // if (itemType == 831) {
                if (lastItem == 13132) {
                    itemHeading = "";
                }
                var description = record.getLineItemValue("item", "custcol_mcc_custdesc", c);
                itemHeading += description;
            // } else {
                if (items[description]) {;
                    var itemName = record.getLineItemText("item", "item", c),
                        item = record.getLineItemValue("item", "item", c),
                        qty = record.getLineItemValue("item", "quantity", c),
                        units = record.getLineItemValue("item", "units_display", c),
                        unitPrice = record.getLineItemValue("item", "rate", c),
                        total = record.getLineItemValue("item", "grossamt", c),
                        toSum = record.getLineItemValue("item", "grossamt", c),
                        cc = record.getLineItemText("item", "custcol_projecttask", c);

//                        nlapiLogExecution('DEBUG','description', record.getLineItemValue('item','custcol_mcc_custdesc',c));
                        qty = (qty)?  parseFloat(qty) : "";
                        unitPrice = (unitPrice)?  addCommas((parseFloat(unitPrice)* 1.12).toFixed(2)) : parseFloat(0).toFixed(2);
                        total = (total)?  addCommas(parseFloat(total).toFixed(2)) : parseFloat(0).toFixed(2);
//                    nlapiLogExecution('DEBUG','projecttask',cc);
                    items[description].push({
                        "item": item,
                        "classcode": cc,
                        "itemname": itemName,
                        "qty": qty,
                        "unit": units,
                        "unitprice": unitPrice,
                        "total": total,
                        "grandtotal": parseFloat(toSum),
                    });
                }
                lastItem = itemType;
            // }
        }
    }
    var body = "";//'<table width="100%" border="2px solid #808080" table-layout="fixed">' + getTableHeader();
    var carryOver = 0.00; //1.1.1 - Refactored from carrOver to carryOver 10_Rodmar
    var lastdesctiption = "none";
    var determinant = 1;
    var itemsDisplayed = 1;
    var totalRows = 0;
    var grandTotal = 0.00;
    var meh = []; // for description monitoring purposes only
    var totalChars = 0;
    for (var description in items) {
        meh.push(description);
    }
         nlapiLogExecution('ERROR','DATA', JSON.stringify(items));
    /*
        Populate table content
     */
         
         var textThatCanFit = "";
         var textFromSpaceAdjustment = "";
         
    for (var description in items) {
    	
        /*
            Populate current description items
         */
        for (var c = 0, length = items[description].length; c < length; c++) {
            // nlapiLogExecution("debug", "ITEM LENGTH", length);
            var chars = description.length;
            totalChars += chars;
            
            
            // 1.0.1 - 10_Rodmar
            var shouldDisplayPrice = true;
            var shouldDisplayClass = false;
            
            if(availableChars <= AVERAGE_CHARS_PER_LINE && availableChars < description.length)
            {
            	body += getCarryOverHtmlBottom(carryOver);
            	body += getCarryOverHtmlTop(carryOver);
 	            body += buildTableSet();
 	            
        		availableChars = CHAR_LIMIT_PER_PAGE;
            }
            
            if(description.length < availableChars)
            {
            	textThatCanFit = 
            		description;
            	remainingText = "";
            	availableChars -= getAdjustedSpaceConsumption(textThatCanFit.length, 0); //integer
            	shouldDisplayClass = true;
            }
            else
            {
            	var finIndex = 0;
            	if (description.length < availableChars){
            		finIndex = description.length;
            	}
            	else
            	{
            		finIndex = availableChars;
            	}
            	
            	textThatCanFit = description.substring(0, finIndex);
            	
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
            	
            	remainingText = description.substring(textThatCanFit.length);
            	
            	if(remainingText.length > 0)
            	{
            		textThatCanFit += CONTINUED_SYMBOL;
            	}
            }
            
            if(textThatCanFit.length > 0)
            {
            	body += getHtmlFor("htmlForDescription", textThatCanFit, items[description][c], shouldDisplayPrice, shouldDisplayClass);
            }
            
            while (remainingText.length > 0)
            {
            	
            	body += getCarryOverHtmlBottom(carryOver);
            	body += getCarryOverHtmlTop(carryOver);
 	            body += buildTableSet();

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
                }
                else
                {
                	shouldDisplayClass = true;
                }
                
                body += getHtmlFor("htmlForDescription", textThatCanFit, items[description][c], shouldDisplayPrice, shouldDisplayClass);
                
                if(remainingText.length > 0)
            	{
                	remainingText = textFromSpaceAdjustment + "" + remainingText;
            	}
            	else
            	{
            		availableChars -= getAdjustedSpaceConsumption(textThatCanFit.length, 0);
            		shouldDisplayClass = true;
            	}

                textFromSpaceAdjustment = "";
            }
            
            availableChars -= AVERAGE_CHARS_PER_LINE;
            
            carryOver += parseFloat(items[description][c].total) || 0.00;
            lastdesctiption = description;
            itemsDisplayed++;
            totalRows++;
            if(items[description][c].grandtotal){
                grandTotal += parseFloat(items[description][c].grandtotal);
            }
//            nlapiLogExecution('DEBUG','GRANDTOTAL',grandTotal);
            // if ((itemsDisplayed) % 8 === 0 || itemsDisplayed == 9) {
            //     body += "<tr>" +
            //         "<td border-top='2px solid #808080' colspan='4' align='right'>"  +
            //             "<p align='right'><b>Carry Over:</b></p>" +
            //         "</td>" +
            //         "<td border-top='2px solid #808080' align='right'><b>" + addCommas(carrOver.toFixed(2)) + "</b></td>" +
            //         "</tr></table><pbr/>" + '<table width="100%" border="2px solid #808080" table-layout="fixed">' + getTableHeader();
            //     itemsDisplayed = 1;
            // }
            
            
        }
        
        itemsDisplayed++;
        totalRows++;
        lastdesctiption = description;
        
    }
    
    //1.1.1 - 10_Rodmar add grand total
    body += "<tr>" +
             "<td border-top='2px solid #808080' colspan='4' align='right'>"  +
                 "<p align='right'><b>Grand Total:</b></p>" +
             "</td>" +
             "<td border-top='2px solid #808080' align='right'><b>" + addCommas(carryOver.toFixed(2)) + "</b></td>" +
             "</tr>";
    
    //"</table>" +
    var endingTables = "";
    if (record.getFieldValue("custbody_mcc_job_inclusions")) {
        endingTables += "<table>" +
            "<tr>" +
                "<td border='2px solid #808080' padding='10px'>" +
                    "<p align='left'>" + "<b>JOB INCLUSIONS/EXCLUSIONS</b><pbr/>" +
                        wordWrap(record.getFieldValue("custbody_mcc_job_inclusions")) + 
                    "</p>" +
                "</td>" +
            "</tr>" +
        "</table>";//<pbr/>
    }
    if (record.getFieldValue("custbody_mcc_job_exclusions")) {
        endingTables +="<table width='100%'>" +
            "<tr>" +
                "<td border='2px solid #808080' padding='10px'>" +
                    "<p align='left'>" + "<b>TERMS OF PAYMENT</b><pbr/>" +
                        wordWrap(record.getFieldValue("custbody_mcc_job_exclusions")) + 
                    "</p>" +
                "</td>" +
            "</tr>" +
        "</table>";//<pbr/>
    }
    endingTables +=    
        "<table border='2px solid #808080' width='100%'>" +
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
//    nlapiLogExecution("debug", "subcon values", JSON.stringify(chargeToSubcon));
    var quotRef = record.getFieldValue("custbody_mcc_quotation_reference");
    quotRef = (quotRef) ? quotRef : "";
    chargeToSubcon = (chargeToSubcon) ? ("charge to:" + 
        JSON.parse(JSON.stringify(chargeToSubcon)).toString().replace(",", ", ")) : "";
    endingTables = endingTables.replace("{start}", record.getFieldValue("custbody_mcc_work_start_date"));
    endingTables = endingTables.replace("{completion}", record.getFieldValue("custbody_mcc_work_end_date"));
    endingTables = endingTables.replace("{chargesubcon}", chargeToSubcon);
    endingTables = endingTables.replace("{linkedorders}", linkedOrders);
    endingTables = endingTables.replace("{quotref}", quotRef);
    endingTables = endingTables.replace(/&amp;/g, "&amp;");
    var vendor = record.getFieldValue("custbody_mcc_subproject"),
        vendorAddress = nlapiLookupField("job", vendor, "custentity_mcc_projectlocation"),
        entity = record.getFieldText("entity"),
        warehouse = record.getFieldText("location");
    entity = entity.substr(entity.indexOf(" "), entity.length);
    var warehouseLen = warehouse.split(":").length;
    warehouse = warehouse.split(":")[warehouseLen - 1];

  
    var columns = new Array();
    var filters = new Array();

    columns[0] = new nlobjSearchColumn('createdby');
    filters[0] = new nlobjSearchFilter('internalid',null,'is',request.getParameter("recordId"));
    var searching = nlapiSearchRecord('purchaseorder','customsearch_mcc_transaction_preparer',filters,columns)
    if(searching){
//        nlapiLogExecution('ERROR','TRUE','asd');    
        var prepby = searching[0].getValue('createdby');
    }else{
//        nlapiLogExecution('ERROR','FALSE','asd');
        var prepby = "";
    }
//    nlapiLogExecution('ERROR','prep',prepby);
    var recby = record.getFieldValue("custbody_mcc_recommending_approval");
    var apprby = record.getFieldValue("nextapprover");
    recby = (recby) ? recby : '';

    var frimgprep = '';
    var frimgam = '';
    var frimgrecby = '';
    var imgprep = '<div width="80px" height="50px" ></div>';
    var imgam = '<div width="80px" height="50px" ></div>';
    var imgrecby = '<div width="80px" height="50px" ></div>';
    var confby = '<div width="80px" height="50px" ></div>';
    if(prepby){
        frimgprep = nlapiLookupField('employee',prepby,'image');
        if(frimgprep){
            imgprep = '<img src="'+ nlapiLoadFile(frimgprep).getURL()+'" width="80px" height="50px" align="center"></img>';
        }
    }
    if(record.getFieldValue('approvalstatus') == 2){
        if(apprby){
//            nlapiLogExecution('ERROR','FLAG','1');
            frimgam = nlapiLookupField('employee',apprby,'image');
//            nlapiLogExecution('ERROR','FLAG','2');
            if(frimgam){
                imgam = '<img src="'+ nlapiLoadFile(frimgam).getURL()+'" width="80px" height="50px" align="center"></img>';
            }
        }
        if(recby){
//            nlapiLogExecution('ERROR','FLAG','1');
            frimgrecby = nlapiLookupField('employee',recby,'image');
//            nlapiLogExecution('ERROR','FLAG','2');
            if(frimgrecby){
                imgrecby = '<img src="'+ nlapiLoadFile(frimgrecby).getURL()+'" width="80px" height="50px" align="center"></img>';
            }
        }        
    }

    var html = nlapiLoadFile(17181).getValue();
    html = html.replace("{prepbysign}",imgprep);
    html = html.replace("{recbysign}",imgrecby);
    html = html.replace("{apprbysign}",imgam);
    html = html.replace("{confbysign}",confby);    
    html = html.replace("{meh}", JSON.stringify(meh));
    html = html.replace("{body}", body);
    html = html.replace("{end}", endingTables);
    html = html.replace("{subcon}", entity);
    html = html.replace("{subconaddress}", wordWrap(record.getFieldValue("billaddress")));
    html = html.replace("{project}", record.getFieldText("custbody_mcc_subproject"));
    html = html.replace("{headterms}", wordWrap(record.getFieldValue("custbody_mcc_terms")));
    html = html.replace("{projectaddress}", vendorAddress);
    html = html.replace("{date}", moment(record.getFieldValue("trandate")).format("MMMM DD,YYYY"));
    html = html.replace("{dp}", record.getFieldValue("custbody_mcc_downpayment_percent"));
    html = html.replace("{progress}", record.getFieldValue("custbody_mcc_progress_billing_percent"));
    html = html.replace("{retention}", record.getFieldValue("custbody_mcc_retentionrate"));
    html = html.replace("{jono}", record.getFieldValue("tranid"));
    html = html.replace("{warehouse}", warehouse);
    html = html.replace("{currency}", record.getFieldValue("currencysymbol"));

    /*
        Signatories
     */
    var userContext = nlapiGetContext();
    //html = html.replace("{prepby}", userContext.getName());
    html = html.replace("{prepbyposition}", record.getFieldValue('custbody_mcc_prepared_by'));
    html = html.replace("{recommend}", record.getFieldText('custbody_mcc_recommending_approval'));
    html = html.replace("{approved}", record.getFieldText('nextapprover'));
    html = html.replace(/&/g, "&amp;");
    html = html.replace(/null/g, "");
    
//  TODO remove after debugging - Rod
//  debugRecord = nlapiCreateRecord('customrecord_rodmardebugger');
//	debugRecord.setFieldValue("custrecord_rodmardebugger_log", html);
//	debugRecord.setFieldValue("custrecord_rodmardebugger_log_title", "full html");
//	debugRecId = nlapiSubmitRecord(debugRecord);
//	nlapiLogExecution("DEBUG", "debugRecId : ", debugRecId);

    var pdf = nlapiXMLToPDF(html);
    response.setContentType("pdf", "PurchaseOrderPrintout(Job).pdf", "inline");
    response.write(pdf.getValue());
}

/**
 * Retrieves all linked orders from the line items
 * @param  {nlobjRecord} record [description]
 * @return {[type]}        [description]
 */
function getLinkedOrders(record) {
    //linkedorder
    var lineitems = record.getLineItemCount("item");
    var linkedOrders = "";
    for (var c = 1; c <= lineitems; c++) {
        var linkedOrder = record.getLineItemText("item", "linkedorder", c);
        linkedOrder = (linkedOrder) ? linkedOrder : false;
        linkedOrders += ((linkedOrder) ? linkedOrder + ", " : "");
    }
    return linkedOrders;
}

function getTableHeader() {
    return '<thead>' +
            '<tr>' +
                '<td width="300px" border-right="2px solid #808080" class="table-header" border-bottom="2px solid #808080">' +
                    '<p align="center" class="bold uppercase">description ("the job")</p>' +
                '</td>' +
                '<td width="100px" border-right="2px solid #808080" class="table-header" border-bottom="2px solid #808080">' +
                    '<p align="center" class="bold uppercase">quantity</p>' +
                '</td>' +
                '<td width="80px" border-right="2px solid #808080" class="table-header" border-bottom="2px solid #808080">' +
                    '<p align="center" class="bold uppercase">unit</p>' +
                '</td>' +
                '<td width="100px" border-right="2px solid #808080" class="table-header" border-bottom="2px solid #808080">' +
                    '<p align="center" class="bold uppercase">unit price</p>' +
                '</td>' +
                '<td width="100px" class="table-header" border-bottom="2px solid #808080">' +
                    '<p align="center" class="bold uppercase">total</p>' +
                '</td>' +
            '</tr>' +
        '</thead>';
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
function getHtmlFor(type, displayableText, itemsDescription, shouldDisplayPrice, shouldDisplayClass)
{
	var table = "";
	try
	{
		switch(type)
		{
			case "htmlForDescription":
				
				if (itemsDescription.item != 831 && itemsDescription.item != 835) {
					table += "<tr>" +
                        "<td border-right='2px solid #808080'><p align='left'>"+displayableText+"</p></td>" +
                        "<td border-right='2px solid #808080'></td>" +
                        "<td border-right='2px solid #808080'></td>" +
                        "<td border-right='2px solid #808080'></td>" +
                        "</tr>";
                }
	             
		        	table += "<tr>" +
	                    "<td padding-bottom='1px' border-right='2px solid #808080'>" + 
	                        "<p>" + displayableText + "</p>";
		        	
		        	if(shouldDisplayClass == true)
    	            {
		        		shouldDisplayClass = false;
		        		table += "<p top='-10' padding-left='20px' ><b>Class:</b> " + itemsDescription.classcode + "</p>";
		        		
		        		var itemsDescriptionAdjustedLength = getAdjustedSpaceConsumption(itemsDescription.classcode.length, 1);
		        		availableChars -= itemsDescriptionAdjustedLength;
    	            }
		        	
		        	if(shouldDisplayPrice == true)
    	            {
    		        	shouldDisplayPrice = false;
    		        	
    		        	table +=
		                    "</td>" +
		                    "<td padding-bottom='1px' border-right='2px solid #808080' align='center'>" + 
		                    itemsDescription.qty + 
		                    "</td>" +
		                    "<td padding-bottom='1px' border-right='2px solid #808080' align='center'>" + 
		                    itemsDescription.unit + 
		                    "</td>" +
		                    "<td padding-bottom='1px' border-right='2px solid #808080' align='right'>" + 
		                    itemsDescription.unitprice + 
		                    "</td>" +
		                    "<td padding-bottom='1px' align='right'>" + 
		                    itemsDescription.total + 
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
function getAdjustedSpaceConsumption(charLength, tabs)
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