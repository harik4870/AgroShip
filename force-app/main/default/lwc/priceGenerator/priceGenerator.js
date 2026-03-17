import { LightningElement, track, wire } from 'lwc';

import getCompetitorAccounts from '@salesforce/apex/PriceGeneratorController.getCompetitorAccounts';
import getcompetitorsAndOpportunities from '@salesforce/apex/PriceGeneratorController.getcompetitorsAndOpportunities';
import getSuppliers from '@salesforce/apex/PriceGeneratorController.getSuppliers';
import createOpportunity from '@salesforce/apex/PriceGeneratorController.createOpportunity';
import updateSupplierOffers from '@salesforce/apex/PriceGeneratorController.updateSupplierOffers';

import { getObjectInfo, getPicklistValues } from 'lightning/uiObjectInfoApi';

import OPPORTUNITY_OBJECT from '@salesforce/schema/IDA__c';
import CATEGORY_FIELD from '@salesforce/schema/IDA__c.Category_Picklist__c';
import SUBCATEGORY_FIELD from '@salesforce/schema/IDA__c.Sub_Category_Picklist__c';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CloseActionScreenEvent } from 'lightning/actions';
import { NavigationMixin } from 'lightning/navigation';

export default class PriceGenerator extends NavigationMixin(LightningElement) {

    @track activeSections = ['OpportunityDetails'];
    @track categoryOptions = [];
    @track subCategoryOptions = [];
    @track competitors = [];
    @track opportunities = [];
    @track vendors = [];
    @track filteredVendors = [];
    @track opportunityDraft = {};
    @track draftValues = [];

    accountId;
    recordTypeId;
    accountFilter;
    categoryValue;
    subCategoryValue;
    picklistFieldValues;
    location = '';
    selectedVendor;

    competitorColumns = [
        { label: 'Name', fieldName: 'Competitor__c', type: 'text' },
        { label: 'Price', fieldName: 'Price__c', type: 'number' }
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
        { label: 'Sales Price', fieldName: 'Sales_price__c', type: 'currency' },
        { label: 'Estimated Profit', fieldName: 'Estimated_Profit__c', type: 'text' }
    ];

    connectedCallback() {
        this.loadRecordType();
        this.loadVendors();
    }

    loadRecordType() {
        getCompetitorAccounts()
            .then(result => {
                this.recordTypeId = result;

                this.accountFilter = {
                    criteria: [
                        {
                            fieldPath: 'RecordTypeId',
                            operator: 'eq',
                            value: this.recordTypeId
                        }
                    ]
                };
            });
    }

    loadVendors() {
        getSuppliers()
            .then(result => {

                const formatted = result.map(row => ({
                    ...row,
                    VendorName: row.Vendor__r ? row.Vendor__r.Name : '',
                    Description: row.Product__r ? row.Product__r.Name : ''
                }));

                this.vendors = formatted;
                this.filteredVendors = [...formatted];
            });
    }

    get hasCompetitors() {
        return this.competitors?.length > 0;
    }

    get hasOpportunities() {
        return this.opportunities?.length > 0;
    }

    get hasVendors() {
        return this.filteredVendors?.length > 0;
    }

    get isSubCategoryDisabled() {
        return !this.categoryValue;
    }

    handleAccountChange(event) {

        this.accountId = event.detail.recordId;
        this.opportunityDraft.AccountId = this.accountId;

        if (this.accountId) {

            this.activeSections = ['OpportunityDetails','Competitors','Opportunities'];

            getcompetitorsAndOpportunities({ accountId: this.accountId })
                .then(result => {
                    this.competitors = result.competitors;
                    this.opportunities = result.opportunities;
                });

        } else {

            this.activeSections = ['OpportunityDetails'];
            this.competitors = [];
            this.opportunities = [];

        }

        if (this.categoryValue && !this.activeSections.includes('Vendors')) {
            this.activeSections = [...this.activeSections, 'Vendors'];
        }
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

        this.subCategoryValue = null;
        this.opportunityDraft.Sub_Category_Picklist__c = null;

        this.filterSubCategories();
        this.filterVendors();

        if (!this.activeSections.includes('Vendors')) {
            this.activeSections = [...this.activeSections, 'Vendors'];
        }
    }

    handleSubCategoryChange(event) {

        this.subCategoryValue = event.detail.value;
        this.opportunityDraft.Sub_Category_Picklist__c = this.subCategoryValue;

        this.filterVendors();
    }

    filterSubCategories() {

        if (!this.picklistFieldValues || !this.categoryValue) {
            this.subCategoryOptions = [];
            return;
        }

        const controllerKey = this.picklistFieldValues.controllerValues[this.categoryValue];

        this.subCategoryOptions =
            this.picklistFieldValues.values.filter(
                option => option.validFor.includes(controllerKey)
            );
    }

    handleChange(event) {

        const field = event.target.dataset.field;
        const value = event.target.value;

        this.opportunityDraft[field] = value;

        if (field === 'Location') {
            this.location = value;
            this.filterVendors();
        }
    }

    filterVendors() {

        this.filteredVendors = this.vendors.filter(vendor => {

            const matchCategory =
                this.categoryValue ? vendor.Category__c === this.categoryValue : true;

            const matchSubCategory =
                this.subCategoryValue ? vendor.Sub_Category__c === this.subCategoryValue : true;

            const matchLocation =
                this.location && this.location.length >= 3
                    ? vendor.FOB_Location__c?.toLowerCase().includes(this.location.toLowerCase())
                    : true;

            return matchCategory && matchSubCategory && matchLocation;
        });
    }

    handleVendorSelection(event) {

        const rows = event.detail.selectedRows;

        this.selectedVendor = rows.length ? rows[0].Id : null;
    }

    createOpportunity() {

        if (!this.accountId || !this.categoryValue || !this.subCategoryValue) {

            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Missing Required Fields',
                    message: 'Account, Category and Sub Category are required.',
                    variant: 'error'
                })
            );

            return;
        }

        this.opportunityDraft.AccountId = this.accountId;
        this.opportunityDraft.Category_Picklist__c = this.categoryValue;
        this.opportunityDraft.Sub_Category_Picklist__c = this.subCategoryValue;

        createOpportunity({ opportunityData: this.opportunityDraft })
            .then(result => {

                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Opportunity Created',
                        variant: 'success'
                    })
                );

                this.dispatchEvent(new CloseActionScreenEvent());

                setTimeout(() => {
                    window.location.href = '/lightning/r/IDA__c/' + result + '/view';
                }, 300);
            });
    }

   handleVendorSave(event) {

    const updatedFields = event.detail.draftValues.map(d => ({ ...d }));

    updateSupplierOffers({ suppliers: updatedFields })
        .then(() => {

            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Vendor updated successfully',
                    variant: 'success'
                })
            );

            this.draftValues = [];

            return getSuppliers();
        })
        .then(data => {

            const formatted = data.map(row => ({
                ...row,
                VendorName: row.Vendor__r ? row.Vendor__r.Name : '',
                Description: row.Product__r ? row.Product__r.Name : ''
            }));

            this.vendors = formatted;

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
}