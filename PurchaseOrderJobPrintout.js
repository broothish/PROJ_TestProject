/**
 * Script Name / Script File : [nr] PurchaseOrderJobPrintout / PurchaseOrderJobPrintout.js
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
 * Notes:			customscript_purchase_order_job_prntout
 * 					customdeploy_purchase_order_job_prntout
 * 
 * Project:
 * 
 * Version:			1.0.0 - Date - Initial Release - Nowe
 * 					1.1.0 - 08/29/2017 - ChangeRequest# - ProjectPhase#
 * 							- Fixed PO Printout Issues - Rodmar
 * 
 * Libraries: 	mgwd_util.js
 * 				moment.min.js
 * 
 */


/* 
* @Author: nowee
* @Date:   2016-02-24 11:39:34
* @Last Modified by:   nowee
* @Last Modified time: 2016-05-04 13:34:19
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

/*
 * flag to display price
 */
var shouldDisplayPrice = true;


function getTableHeader(displayCarryOver, carryOver) {
	
	var carryOverHtml = "";
	if(displayCarryOver == true && carryOver)
	{
		carryOverHtml +=
	        "<tr>" +
	            "<td class='bottom-bordered' colspan='4' align='right'><b>Carry Over:</b></td>" +
	            "<td class='bottom-bordered' align='right'>" + addCommas(carryOver.toFixed(2)) + "</td>" +
	            "</tr>" ;
	}
	
    return "<table class='jo-details' page-break-inside='avoid' border='2px solid #808080'>" +
    "<thead>" +
    carryOverHtml
    +
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
 * [getMrNo description]
 * @param  {nlobjRecord} record [description]
 * @return {[type]}        [description]
 */
function getMrNo(record, lineitems) {
    var mr = "";
    var mrs = [];
    for (var c = 1; c <= lineitems; c++) {
        var tmp = record.getLineItemText("item", "linkedorder", c);
        if (mrs.indexOf(tmp)) {
            mr += tmp;
            mrs.push(tmp);
        }
    }
    return mr;
}

/**
 * Generates printout for job orders
 * @param  {nlobjRequest} request  netsuite request object
 * @param  {nlobjResponse} response netsuite response object
 * @return {[type]}          [description]
 */
function suitelet(request, response) {
    var record = nlapiLoadRecord(request.getParameter('recordType'),
        request.getParameter('recordId')),
        location = record.getFieldText('location'),
        locationSplitLength = location.split(":").length,
        date = record.getFieldValue('trandate'),
        subproject = record.getFieldText('custbody_mcc_subproject'),
        entity = nlapiLookupField('vendor', record.getFieldValue('entity'), 
            'isperson'),
        bu = record.getFieldText('class'),
        poNo = record.getFieldValue('tranid'),
        deliveryDate = record.getFieldValue('custbody_mcc_datedelivered'),
        currency = record.getFieldValue('currencysymbol'),
        terms = record.getFieldText('terms'),
        user = nlapiGetContext().getName(),
        grandTotal = 0.00, amt = 0.00, tmptotal = 0.000,
        totalCounter = 1,
        lineitems = record.getLineItemCount('item'),
        customForm = record.getFieldText('customform'),
        mrNo = getMrNo(record, lineitems),
        recommendingApproval = record.getFieldText("custbody_mcc_recommending_approval"),
        preparedBy = record.getFieldValue("custbody_mcc_prepared_by"),
        approvedBy = record.getFieldText("nextapprover");
  		vendor = nlapiLoadRecord('vendor', record.getFieldValue('entity'));
  		ADDREZ = vendor.getLineItemValue('addressbook', 'label', 1);

        recommendingApproval = recommendingApproval ? recommendingApproval : "";
        preparedBy = preparedBy ? preparedBy : "";
        approvedBy = approvedBy ? approvedBy : "";

        project = record.getFieldText("class");
        project = project ? project.split(':')[project.split(':').length-1] : "";
        projectaddress = record.getFieldValue('custbody_mcc_bu_address');

        var columns = new Array();
        var filters = new Array();

        columns[0] = new nlobjSearchColumn('createdby');
        filters[0] = new nlobjSearchFilter('internalid',null,'is',request.getParameter("recordId"));
        var searching = nlapiSearchRecord('purchaseorder','customsearch_mcc_transaction_preparer',filters,columns)
        var prepby = searching[0].getValue('createdby');
        var recby = record.getFieldValue("custbody_mcc_recommending_approval");
        var apprby = record.getFieldValue("nextapprover");
        recby = (recby) ? recby : '';
        var revname = record.getFieldText("nextapprover");
        var frimgprep = '';
        var frimgam = '';
        var frimgrecby = '';
        var imgprep = '<div width="80px" height="50px" ></div>';
        var imgam = '<div width="80px" height="50px" ></div>';
        var imgrecby = '<div width="80px" height="50px" ></div>';
        var apprvby = '<div width="80px" height="50px" ></div>';
        if(prepby){
            frimgprep = nlapiLookupField('employee',prepby,'image');
            if(frimgprep){
                imgprep = '<img src="'+ nlapiLoadFile(frimgprep).getURL()+'" width="80px" height="50px" align="center"></img>';
            }
        }
        if(record.getFieldValue('approvalstatus') == 2){
            if(apprby){
                nlapiLogExecution('ERROR','FLAG','1');
                frimgam = nlapiLookupField('employee',apprby,'image');
                nlapiLogExecution('ERROR','FLAG','2');
                if(frimgam){
                    imgam = '<img src="'+ nlapiLoadFile(frimgam).getURL()+'" width="80px" height="50px" align="center"></img>';
                }
            }
            if(recby){
                nlapiLogExecution('ERROR','FLAG','1');
                frimgrecby = nlapiLookupField('employee',recby,'image');
                nlapiLogExecution('ERROR','FLAG','2');
                if(frimgrecby){
                    imgrecby = '<img src="'+ nlapiLoadFile(frimgrecby).getURL()+'" width="80px" height="50px" align="center"></img>';
                }
            }        
        }
        
    entity = (entity == 'T') ? 
        nlapiLookupField('vendor', record.getFieldValue('entity'), 'altname') : 
        nlapiLookupField('vendor', record.getFieldValue('entity'), 'companyname');
    if (locationSplitLength > 0) {
        location = location.split(":")[locationSplitLength - 1];
    }
    var grossamt, rate, qty, description, itemName, itemCode, classcode, brand, 
        itemCounter = 1, carryOver = 0.00, taxAmt = 0.00, assetName, assetCode, 
        plateNo, additionalDescription, headerDescription, contentsHolder = [], 
        itemsAdded = 1, isIndedted = false, hasGrandTotal = false, units,
        currItem, table, chars=0;
    table = getTableHeader();
    for (var c = 1; c <= lineitems; c++) {
        if (record.getLineItemValue("item", "isclosed", c) == "F") {
            currItem = parseInt(record.getLineItemValue('item', 'item', c));
            if (currItem == 831 || currItem == 835) {
                isIndedted = true;
                headerDescription = record.getLineItemValue("item", "custcol_mcc_custdesc", c);
            } else {
                isIndedted = false;
            }
            headerDescription = headerDescription ? headerDescription : "";
            additionalDescription = (currItem == 13132) ? "" : 
                record.getLineItemValue("item", "custcol_mcc_custdesc", c); additionalDescription = additionalDescription ? additionalDescription :  "";
            itemName = (currItem == 13132) ? 
                record.getLineItemValue("item", "custcol_mcc_custdesc", c) :
                record.getLineItemValue("item", "item_display", c); itemName = itemName ? itemName :  "";
            itemCode = (itemName) ? 
                itemName.substr(0, itemName.indexOf(" ")) : 
                ""; itemCode = itemCode ? itemCode : "";
            units = record.getLineItemValue("item", "units_display", c);
            classcode = record.getLineItemValue("item", "custcol_classcode_display", c); classcode = classcode ? classcode : "";
            assetName = record.getLineItemText("item", "custcol_mcc_asset_name", c);
            assetName = (assetName) ? 
                assetName.substr(assetName.indexOf(" ")) : 
                "";
            assetName = assetName ? assetName : "";
            assetCode = (assetName) ? 
                assetName.substr(0, assetName.indexOf(" ")) : 
                ""; assetCode = assetCode ? assetCode : "";
            plateNo = record.getLineItemValue("item", "custcol_mcc_asset_distinction", c); plateNo = plateNo ? plateNo : "";
            brand = record.getLineItemText("item", "custcol2", c);
            itemName = (brand) ? itemName + " (" + brand + ")" : itemName; itemName = itemName ? itemName : "";
            qty = record.getLineItemValue("item", "quantity", c);
            rate = parseFloat(record.getLineItemValue("item", "rate", c));
            rate = isNaN(rate) ? 0.00 : rate;
            taxAmt = parseFloat(record.getLineItemValue("item", "tax1amt", c));
            taxAmt = isNaN(taxAmt) ? 0.00 : taxAmt;
            taxRate = parseFloat(record.getLineItemValue('item', 'taxrate1', c))
            taxRate = isNaN(taxRate) ? 0.00 : (taxRate / 100);
            grossamt = parseFloat(record.getLineItemValue("item", "grossamt", c));
            grossamt = isNaN(grossamt) ? 0.00 : grossamt;
            chars += parseInt(parseInt(headerDescription.length) + parseInt(itemName.length) + parseInt(additionalDescription.length) + parseInt(assetName.length) + parseInt(assetCode.length) + parseInt(plateNo.length) + parseInt(classcode.length));
            
            var textThatCanFit = "";
            var textFromSpaceAdjustment = "";
            shouldDisplayPrice = true;
            var shouldDisplayClass = false;
            
            carryOver += grossamt;
            grandTotal += grossamt;
            
            priceDetails = {qty: qty, units: units, rate : rate, taxRate : taxRate, grossamt : grossamt};
            
            if(assetName) {
                table +=
                "<tr>" +
                  "<td>" +
                    "<p align='left'>"  + assetName + " " + plateNo + "</p>" +
                  "</td>" +
                  "<td vertical-align='top' align='center' class='left-bordered'></td>"  +
                  "<td vertical-align='top' align='center' class='left-bordered'></td>" +
                  "<td vertical-align='top' align='right' class='left-bordered'></td>" +
                  "<td vertical-align='top' align='right' class='left-bordered'></td>" +
                "</tr>";
                
                availableChars -= getAdjustedSpaceConsumption(assetName.length, 0);
              }
            
            if(currItem == 831 || currItem == 835){
                itemName= "";
            }
            if(currItem == 831){
            	shouldDisplayPrice = false; // dont display price for this item
            }  
            
            //1.0.1 - 10_Rodmar
            table +=
                "<tr>" +
                  "<td>";
                    assetName ? table+="<p align='left' padding-left='0.25cm'>" : table+="<p align='left'>"; table+= itemName/* + "</p>"*/;
                    
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
                    }
                   
                    
                    	var lastSpacePosition = textThatCanFit.lastIndexOf(" ", textThatCanFit.length)
	                
	  	                if(lastSpacePosition != -1 && lastSpacePosition != 0)
	  	                {
	  	                	textFromSpaceAdjustment = textThatCanFit.substring(lastSpacePosition, textThatCanFit.length);
	  	                	remainingText = textFromSpaceAdjustment + remainingText
	  	                	textThatCanFit = textThatCanFit.substring(0, lastSpacePosition);
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
                    
                    
	  	            	table += getHtmlFor("htmlForDescription", textThatCanFit, priceDetails, shouldDisplayClass, classcode, assetName);
                    
                    while (remainingText.length > 0)
                    {
	                      	table += getCarryOverHtmlBottom(carryOver);
	     	                table += getCarryOverHtmlTop(carryOver);
	
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
	     	                
	     	               table += "<tr><td><p>";
	     	                table += getHtmlFor("htmlForDescription", textThatCanFit, priceDetails, shouldDisplayClass, classcode, assetName);
	     	                
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

            itemsAdded += 1;

            if (c == lineitems) {
                table += "<tr>" +
                "<td class='top-bordered' colspan='4' align='right'><b>Grand Total: " + currency + "</b></td>" +
                "<td class='top-bordered' align='right'><b>" + addCommas(carryOver.toFixed(2)) + "</b></td>" +
                "</tr>";
                 table += "</tbody></table>";
            }
        } else {
            if (c == lineitems) {
                if (!hasGrandTotal) {
                    table += "<tr>" +
                    "<td class='top-bordered' colspan='4' align='right'><b>Grand Total: " + currency + "</b></td>" +
                    "<td class='top-bordered' align='right'><b>" + addCommas(carryOver.toFixed(2)) + "</b></td>" +
                    "</tr>";
                }
                table += "</tbody></table>";
            }
        }
    }
    var endingTables = "";
    endingTables += "<table width='100%' margin-top='20px'>" +
		"<tr>" +
			"<td><b>WORK SCHEDULE</b><br/></td>" +
		"</tr>" +
	    "<tr>" +
	        "<td>" +
	            "<p class='uppercase'>start date: {start}<br/>" +
	            "completion date: {completion}<br/>" +
	            "<span class='uppercase'>{chargesubcon}</span><br/>" +
	            "<span class='uppercase'>{linkedorders}</span><br/>" +
	            "<b class='uppercase'>{quotref}</b><br/>" +
	            "</p>" +
	        "</td>" +
	    "</tr>";    
    var inclusions = record.getFieldValue('custbody_mcc_job_inclusions');
    if (inclusions) {
        endingTables += 
        	"<tr>" +
        		"<td><b>JOB INCLUSIONS</b></td>" +
        	"</tr>" +
            "<tr>" +
                "<td padding='10px'>" +
                    "<p align='left'>" + 
                        wordWrap(inclusions) + 
                    "</p>" +
                "</td>" +
            "</tr>";
    }
    endingTables += "</table>";
    var exclusions = record.getFieldValue('custbody_mcc_job_exclusions');
    if (exclusions) {
        endingTables +="<pbr/><table width='100%'>" +
	        "<tr>" +
				"<td><b>TERMS OF PAYMENT</b></td>" +
			"</tr>" +
            "<tr>" +
                "<td padding='10px'>" +
                    "<p align='left'>" + 
                        wordWrap(exclusions) + 
                    "</p>" +
                "</td>" +
            "</tr>" +
        "</table>";
    }


    var signatories = "<tr>";
    if(preparedBy) {
        signatories +=
       "<td width='2in'>" + 
           "<p align='left'><b class='uppercase'>prepared by:</b></p>" + 
       "</td>";
    }
    if(recommendingApproval) {
        signatories +=
        "<td width='2in' margin-left='10px'>" + 
           "<p align='left'><b class='uppercase'>recommending approval by:</b></p>" + 
        "</td>";
    }
    if(approvedBy) {
        signatories +=
        "<td width='2in' margin-left='10px'>" + 
           "<p align='left'><b class='uppercase'>approved by:</b></p>" + 
        "</td>"
    }

    signatories+=
       "<td width='2in' margin-left='10px'>" + 
           "<p align='left'><b class='uppercase'>conformed by:</b></p>" + 
       "</td>" + 
    "</tr>" +
    "<tr>";

    if(preparedBy) {
        signatories +=
        "<td align='center'>" + 
         imgprep+
         "<hr width='1.5in'/>" + 
           "<p class='bold uppercase' align='center'>"+ preparedBy +"</p>" + 
        "</td>";
    }
    if(recommendingApproval) {
        signatories +=
       "<td align='center'>" + 
        imgrecby+
         "<hr width='1.5in'/>" + 
           "<p class='bold uppercase' align='center'>" + recommendingApproval + "</p>" + 
       "</td>";
    }
    if(approvedBy) {
        signatories +=
        "<td align='center'>" + 
         imgam+
         "<hr width='1.5in'/>" + 
           "<p class='bold uppercase' align='center'>"+ approvedBy +"</p>" + 
        "</td>";
    }
    signatories +=
       "<td align='center'>" + 
       apprvby+
         "<hr width='1.5in'/>" + 
           "<p></p>" + 
       "</td>" + 
    "</tr>";

    nlapiLogExecution("debug", "TABLE CONTENT", table);
    var linkedOrders = getLinkedOrders(record);
    var chargeToSubcon = record.getFieldTexts("custbody_mcc_charge_to_subcon");
    if (chargeToSubcon) {
        var holder = '';
        chargeToSubcon.forEach(function(stringComponent, index, arr) {
            if (index != arr.length) {
                stringComponent = stringComponent ? stringComponent.substr(stringComponent.indexOf(" ")) : "";
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
    var vendor = record.getFieldValue("custbody_mcc_subproject"),
        vendorAddress = (vendor) ?  
            nlapiLookupField("job", vendor, "custentity_mcc_projectlocation") : 
        record.getFieldText("location"),
        warehouse = record.getFieldText("location");
    var warehouseLen = warehouse.split(":").length;
    warehouse = warehouse.split(":")[warehouseLen - 1];
    var html = nlapiLoadFile(16282).getValue();
    // html = html.replace("{meh}", JSON.stringify(meh));
    // html = html.replace("{body}", body);
    html = html.replace("{body}", table);
    html = html.replace("{signatories}", signatories);
    html = html.replace("{end}", endingTables);
    html = html.replace("{entity}", entity);
    html = html.replace("{entitybilling}", ADDREZ);
    html = html.replace("{subproj}", subproject);
    html = html.replace("{project}", project);
    html = html.replace("{headterms}", wordWrap(record.getFieldValue("custbody_mcc_terms")));
    html = html.replace("{projectaddress}", projectaddress);
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
    html = html.replace("{prepby}", userContext.getName());
    html = html.replace("{prepbyposition}", "<b class='capitalize'>" + 
        userContext.getRoleId() + "</b>");
    html = html.replace(/&/g, "&amp;");
    html = html.replace(/null/g, "");
    
//    TODO remove after debugging - Rod
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
function getHtmlFor(type, displayableText, priceDetails, shouldDisplayClass, classcode, assetName)
{
	var table = "";
	try
	{
		switch(type)
		{
			case "htmlForDescription":
				
		        	table += 
		        			" " + displayableText + "</p>";
		        	
		        	if(shouldDisplayClass == true)
    	            {
		        		assetName ? table+="<p padding-left='0.50cm'>" : table+="<p padding-left='0.25cm'>"; 
		        		table+= "<b>Class: </b>" + classcode + "</p>";
		        		
		        		availableChars -= getAdjustedSpaceConsumption(classcode.length, 0, classcode);
    	            }
		        	
		        	table += "<p></p>";
		        	table += "</td>";
		        	
		        	if(shouldDisplayPrice == true)
    	            {
    		        	shouldDisplayPrice = false;
    		        	
    		        	table +=
    		        		"<td vertical-align='top' align='center' class='left-bordered'>" + priceDetails.qty + "</td>"  +
    	                    "<td vertical-align='top' align='center' class='left-bordered'>" + priceDetails.units  + "</td>" +
    	                    "<td vertical-align='top' align='right' class='left-bordered'>" + addCommas((priceDetails.rate * (1 + priceDetails.taxRate)).toFixed(2)) + "</td>" +
    	                    "<td vertical-align='top' align='right' class='left-bordered'>" + addCommas(priceDetails.grossamt.toFixed(2)) + "</td>"
    	            }
		        	else
		        		{
		        		table +=
		                      "<td vertical-align='top' align='center' class='left-bordered'></td>"  +
		                      "<td vertical-align='top' align='center' class='left-bordered'></td>" +
		                      "<td vertical-align='top' align='right' class='left-bordered'></td>" +
		                      "<td vertical-align='top' align='right' class='left-bordered'></td>";
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
		table += "<tr>" +
        "<td class='top-bordered' colspan='4' align='right'><b>Carry Over:</b></td>" +
        "<td class='top-bordered' align='right'>" + addCommas(carryOver.toFixed(2)) + "</td>" +
        "</tr>";
	    table += "</tbody></table>";
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
		table += getTableHeader(true, carryOver);
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