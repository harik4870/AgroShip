public class PriceGeneratorController {

    public class PriceGeneratorWrapper {
        @AuraEnabled public Opportunity opportunity;
        @AuraEnabled public List<Competitor__c> competitors;
        @AuraEnabled public List<Opportunity> opportunities;
        @AuraEnabled public List<Supplier_Offer__c> suppliers;
    }

    @AuraEnabled(cacheable=true)
    public static PriceGeneratorWrapper getPriceGeneratorData(Id opportunityId) {

        PriceGeneratorWrapper result = new PriceGeneratorWrapper();

        if(opportunityId == null) return result;

        List<Opportunity> oppList = [SELECT Id, AccountId, Category_Picklist__c, Sub_Category_Picklist__c
                                     FROM Opportunity
                                     WHERE Id = :opportunityId
                                     LIMIT 1];

        if(oppList.isEmpty()) return result;

        result.opportunity = oppList[0];

        Id accountId = result.opportunity.AccountId;

        result.competitors = [SELECT Id, Name, Price__c, Competitor__r.Name, Date__c
                              FROM Competitor__c
                              WHERE Account__c = :accountId
                              ORDER BY Name];

        result.opportunities = [SELECT Id, Name, StageName, Amount
                                FROM Opportunity
                                WHERE AccountId = :accountId
                                ORDER BY CreatedDate DESC
                                LIMIT 3];

        result.suppliers = [SELECT Id, Name, Lumper__c,Landed__c,Sales_price__c,Category__c,Sub_Category__c,
                            Quantity_per_Pallet__c,Freight__c,Estimated_Profit__c,FOB_Location__c,Cost__c,
                            Market__c,Price__c,Vendor__c,Vendor__r.Name,Product__r.Name
                            FROM Supplier_Offer__c
                            WHERE Vendor__r.RecordType.Name = 'Supplier'
                            AND Category__c != NULL
                            AND Sub_Category__c != NULL
                            ORDER BY Vendor__r.Name];

             return result;
       }

   @AuraEnabled
    public static void updateOpportunityWithVendor(Id opportunityId, Id supplierOfferId, String category, String subCategory) {

    if(opportunityId == null || supplierOfferId == null) return;

    Supplier_Offer__c supplier = [SELECT Id, Vendor__c
                                  FROM Supplier_Offer__c
                                  WHERE Id = :supplierOfferId
                                  LIMIT 1];

    Opportunity oppToUpdate = new Opportunity(Id = opportunityId);

    if (supplier != null && supplier.Vendor__c != null) {
        oppToUpdate.AccountId = supplier.Vendor__c;
    }

    oppToUpdate.Category_Picklist__c = category;
    oppToUpdate.Sub_Category_Picklist__c = subCategory;

    update oppToUpdate;
  }

    @AuraEnabled
    public static Id createOpportunity(Opportunity opportunityData){

    if(opportunityData == null || opportunityData.AccountId == null) return null;

    Opportunity opp = new Opportunity();

    opp.AccountId = opportunityData.AccountId;
    opp.Category_Picklist__c = opportunityData.Category_Picklist__c;
    opp.Sub_Category_Picklist__c = opportunityData.Sub_Category_Picklist__c;
    opp.StageName = 'Open';
    opp.CloseDate = system.today();
    opp.Name = 'Price Generator';

    insert opp;

    return opp.Id;
  }

    @AuraEnabled(cacheable=true)
    public static Id getCompetitorAccounts() {

        List<RecordType> rtList = [SELECT Id
                         FROM RecordType
                         WHERE SObjectType = 'Account'
                         AND DeveloperName = 'Competitor'
                         LIMIT 1];
        return rtList.isEmpty() ? null : rtList[0].Id;
    }

   public class AccountDataWrapper {
        @AuraEnabled public List<Competitor__c> competitors;
        @AuraEnabled public List<Opportunity> opportunities;

        public AccountDataWrapper() {
            competitors = new List<Competitor__c>();
            opportunities = new List<Opportunity>();
        }
    }

    @AuraEnabled(cacheable=true)
    public static AccountDataWrapper getcompetitorsAndOpportunities(Id accountId) {

        AccountDataWrapper result = new AccountDataWrapper();

        if(accountId == null) return result;

        result.competitors = [SELECT Id, Name, Price__c
                              FROM Competitor__c
                              WHERE Account__c = :accountId
                              ORDER BY Name];

        result.opportunities = [SELECT Id, Name, StageName, Amount
                                FROM Opportunity
                                WHERE AccountId = :accountId
                                ORDER BY CreatedDate DESC
                                LIMIT 3];

        return result;
    }

    @AuraEnabled
    public static List<Supplier_Offer__c> getSuppliers() {
        List<Supplier_Offer__c> suppliers = new List<Supplier_Offer__c>();
            suppliers = [SELECT Id,Name,FOB_Location__c,Cost__c,Market__c,Price__c,Vendor__r.Name,Lumper__c,Landed__c,Sales_price__c,
                         Quantity_per_Pallet__c,Freight__c,Estimated_Profit__c,Category__c,Sub_Category__c,Product__r.Name
                         FROM Supplier_Offer__c
                         WHERE Vendor__r.RecordType.Name = 'Supplier'
                         ORDER BY Vendor__r.Name];

        return suppliers;
    }

    @AuraEnabled
    public static void updateSupplierOffers(List<Supplier_Offer__c> suppliers) {

    if (suppliers == null || suppliers.isEmpty()) return;
    List<Supplier_Offer__c> recordsToUpdate = new List<Supplier_Offer__c>();

    for (Supplier_Offer__c s : suppliers) {
        Supplier_Offer__c record = new Supplier_Offer__c(Id = s.Id);

        record.FOB_Location__c = s.FOB_Location__c;
        record.Cost__c = s.Cost__c;
        record.Market__c = s.Market__c;
        record.Freight__c = s.Freight__c;
        record.Quantity_per_Pallet__c = s.Quantity_per_Pallet__c;

        recordsToUpdate.add(record);
    }

    if (!recordsToUpdate.isEmpty()) {
        update recordsToUpdate;
    }
  }
}