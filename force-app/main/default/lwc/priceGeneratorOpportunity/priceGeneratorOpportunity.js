import { LightningElement, api, wire, track } from 'lwc';
import getPriceGeneratorData from '@salesforce/apex/PriceGeneratorController.getPriceGeneratorData';
import updateOpportunityWithVendor from '@salesforce/apex/PriceGeneratorController.updateOpportunityWithVendor';
import createOpportunity from '@salesforce/apex/PriceGeneratorController.createOpportunity';
import updateSupplierOffers from '@salesforce/apex/PriceGeneratorController.updateSupplierOffers';
import getSuppliers from '@salesforce/apex/PriceGeneratorController.getSuppliers';

import { getObjectInfo, getPicklistValues } from 'lightning/uiObjectInfoApi';
import OPPORTUNITY_OBJECT from '@salesforce/schema/Opportunity';
import CATEGORY_FIELD from '@salesforce/schema/Opportunity.Category_Picklist__c';
import SUBCATEGORY_FIELD from '@salesforce/schema/Opportunity.Sub_Category_Picklist__c';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CloseActionScreenEvent } from 'lightning/actions';
import { NavigationMixin } from 'lightning/navigation';

export default class PriceGeneratorOpportunity extends NavigationMixin(LightningElement) {

    @api recordId;
    @track competitors = [];
    @track opportunities = [];
    @track vendors = [];
    @track filteredVendors = [];
    @track categoryOptions = [];
    @track opportunityDraft = {};
    @track draftValues = [];

    accountId;
    categoryValue;
    subCategoryValue = [];
    selectedVendor;
    type = '';

    activeSections = ['OpportunityDetails'];
    opportunityData;
    picklistFieldValues;
    wiredDataResult;

    competitorColumns = [
        { label: 'Name', fieldName: 'competitorName', type: 'text' },
        { label: 'Price', fieldName: 'Price__c', type: 'currency' },
        { label: 'Date', fieldName: 'Date__c', type: 'date' }
    ];

    opportunityColumns = [
        { label: 'Name', fieldName: 'Name', type: 'text' },
        { label: 'Stage', fieldName: 'StageName', type: 'text' },
        { label: 'Amount', fieldName: 'Amount', type: 'currency' }
    ];

    supplierColumns = [
        { label: 'Vendor', fieldName: 'VendorName', type: 'text' },
        { label: 'Description', fieldName: 'Description', type: 'text' },
        { label: 'FOB', fieldName: 'FOB_Location__c', type: 'text' },
        { label: 'Quantity Per Truck', fieldName: 'Quantity_per_Pallet__c', type: 'text', editable: true },
        { label: 'Cost', fieldName: 'Cost__c', type: 'text', editable: true },
        { label: 'Market', fieldName: 'Market__c', type: 'text', editable: true },
        { label: 'Freight', fieldName: 'Freight__c', type: 'text', editable: true },
        { label: 'Lumper', fieldName: 'Lumper__c', type: 'text' },
        { label: 'Landed', fieldName: 'Landed__c', type: 'text' },
        { label: 'Sales Price', fieldName: 'Sales_price__c', type: 'currency', editable: true },
        { label: 'Estimated Profit', fieldName: 'Estimated_Profit__c', type: 'text' }
    ];

    @wire(getPriceGeneratorData, { opportunityId: '$recordId' })
    wiredData(result) {
        this.wiredDataResult = result;
        const { data } = result;
        if (data) {
            this.opportunityData = data;
            this.accountId = data.opportunity.AccountId;
            this.categoryValue = data.opportunity.Category_Picklist__c;
            this.subCategoryValue = data.opportunity.Sub_Category_Picklist__c ? data.opportunity.Sub_Category_Picklist__c.split(';') : [];
            this.opportunityDraft = {
                AccountId: this.accountId,
                Category_Picklist__c: this.categoryValue,
                Sub_Category_Picklist__c: data.opportunity.Sub_Category_Picklist__c
            };
            this.competitors = data.competitors.map(row => ({
                ...row,
                competitorName: row.Competitor__r ? row.Competitor__r.Name : ''
            }));
            this.opportunities = data.opportunities;
            const vendorList = data.suppliers.map(row => ({
                ...row,
                VendorName: row.Vendor__r ? row.Vendor__r.Name : '',
                Description: row.Product__r ? row.Product__r.Name : ''
            }));
            this.vendors = vendorList;
            this.filterVendors();
        }
    }

    get hasCompetitors() {
        return this.competitors && this.competitors.length > 0;
    }

    get hasOpportunities() {
        return this.opportunities && this.opportunities.length > 0;
    }

    get hasVendors() {
        return this.filteredVendors && this.filteredVendors.length > 0;
    }

    get isSubCategoryDisabled() {
        return !this.categoryValue;
    }

    get filteredSubCategoryOptions() {
        if (!this.picklistFieldValues || !this.categoryValue) {
            return [];
        }
        const controllerKey = this.picklistFieldValues.controllerValues[this.categoryValue];
        return this.picklistFieldValues.values.filter(option => option.validFor.includes(controllerKey));
    }

    handleVendorSelection(event) {
        const selectedRows = event.detail.selectedRows;
        if (selectedRows.length > 0) {
            this.selectedVendor = selectedRows[0].Id;
        } else {
            this.selectedVendor = null;
        }
    }

    handleAccountChange(event) {
        this.accountId = event.detail.recordId;
        this.opportunityDraft.AccountId = this.accountId;
    }

    handleChange(event) {
        const field = event.target.dataset.field;
        const value = event.target.value;
        this.opportunityDraft[field] = value;

        if (field === 'Type') {
            this.type = value;
            this.filterVendors();
        }
    }

    filterVendors() {
        this.filteredVendors = this.vendors.filter(vendor => {
            const categoryMatch = this.categoryValue ? vendor.Category__c === this.categoryValue : true;
            const subCategoryMatch = this.subCategoryValue.length ? this.subCategoryValue.includes(vendor.Sub_Category__c) : true;
            const locationMatch = this.type && this.type.length >= 3 ? vendor.FOB_Location__c && vendor.FOB_Location__c.toLowerCase().includes(this.type.toLowerCase()) : true;
            return categoryMatch && subCategoryMatch && locationMatch;
        });
    }

    @wire(getObjectInfo, { objectApiName: OPPORTUNITY_OBJECT })
    objectInfo;

    @wire(getPicklistValues, {
        recordTypeId: '$objectInfo.data.defaultRecordTypeId',
        fieldApiName: CATEGORY_FIELD
    })
    categoryPicklist({ data }) {
        if (data) {
            this.categoryOptions = data.values;
        }
    }

    @wire(getPicklistValues, {
        recordTypeId: '$objectInfo.data.defaultRecordTypeId',
        fieldApiName: SUBCATEGORY_FIELD
    })
    subCategoryPicklist({ data }) {
        if (data) {
            this.picklistFieldValues = data;
        }
    }

    handleCategoryChange(event) {
        this.categoryValue = event.detail.value;
        this.opportunityDraft.Category_Picklist__c = this.categoryValue;
        this.subCategoryValue = [];
        this.opportunityDraft.Sub_Category_Picklist__c = null;
        this.filterVendors();
    }

    handleSubCategoryChange(event) {
        const value = event.detail.value;
        this.subCategoryValue = Array.isArray(value) ? value : [];
        this.opportunityDraft.Sub_Category_Picklist__c = this.subCategoryValue.join(';');
        this.filterVendors();
    }

    copyToOpportunity() {
        if (!this.accountId || !this.categoryValue || this.subCategoryValue.length === 0) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Missing Required Fields',
                message: 'Account, Category and Sub Category are required.',
                variant: 'error'
            }));
            return;
        }

        updateOpportunityWithVendor({
            opportunityId: this.recordId,
            supplierOfferId: this.selectedVendor,
            category: this.categoryValue,
            subCategory: this.opportunityDraft.Sub_Category_Picklist__c
        })
            .then(() => {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Success',
                    message: 'Opportunity record updated successfully.',
                    variant: 'success'
                }));
                return refreshApex(this.wiredDataResult);
            })
            .then(() => {
                this.dispatchEvent(new CloseActionScreenEvent());
                setTimeout(() => {
                    this[NavigationMixin.Navigate]({
                        type: 'standard__recordPage',
                        attributes: {
                            recordId: this.recordId,
                            objectApiName: 'Opportunity',
                            actionName: 'view'
                        }
                    });
                }, 300);
            })
            .catch(error => {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Error updating Opportunity',
                    message: error.body ? error.body.message : error.message,
                    variant: 'error'
                }));
            });
    }

    createOpportunity() {
        if (!this.accountId || !this.categoryValue || this.subCategoryValue.length === 0) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Missing Required Fields',
                message: 'Account, Category and Sub Category are required.',
                variant: 'error'
            }));
            return;
        }

        this.opportunityDraft.AccountId = this.accountId;
        this.opportunityDraft.Category_Picklist__c = this.categoryValue;
        this.opportunityDraft.Sub_Category_Picklist__c = this.subCategoryValue.join(';');

        createOpportunity({ opportunityData: this.opportunityDraft })
            .then(result => {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Success',
                    message: 'Opportunity record Created successfully!',
                    variant: 'success'
                }));

                this.dispatchEvent(new CloseActionScreenEvent());

                setTimeout(() => {
                    this[NavigationMixin.Navigate]({
                        type: 'standard__recordPage',
                        attributes: {
                            recordId: result,
                            objectApiName: 'Opportunity',
                            actionName: 'view'
                        }
                    });
                }, 300);
            })
            .catch(error => {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Error',
                    message: error.body ? error.body.message : error.message,
                    variant: 'error'
                }));
            });
    }

    handleVendorSave(event) {
    const updatedFields = event.detail.draftValues.map(draft => ({ ...draft }));

    updateSupplierOffers({ suppliers: updatedFields })
        .then(() => {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Vendor record updated successfully!',
                    variant: 'success'
                })
            );

            this.draftValues = [];

            return getSuppliers();
        })
        .then(data => {
            const vendorList = data.map(row => ({
                ...row,
                VendorName: row.Vendor__r ? row.Vendor__r.Name : '',
                Description : row.Product__r ? row.Product__r.Name : ''
            }));

            this.vendors = vendorList;
            this.filterVendors();
        })
        .catch(error => {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: error.body ? error.body.message : error.message,
                    variant: 'error'
                })
            );
        });
}

    renderedCallback() {
        const modal = this.template.host.closest('.slds-modal__container');
        if (modal) {
            modal.style.width = '90%';
            modal.style.maxWidth = '1400px';
        }
    }
}