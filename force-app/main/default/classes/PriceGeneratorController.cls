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

        result.opportunity = [SELECT Id, AccountId, Category_Picklist__c, Sub_Category_Picklist__c
                              FROM Opportunity
                              WHERE Id = :opportunityId];

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
                            Market__c,Price__c,Vendor__r.Name,Product__r.Name
                            FROM Supplier_Offer__c
                            WHERE Vendor__r.RecordType.Name = 'Supplier'
                            AND Category__c != NULL
                            AND Sub_Category__c != NULL
                            ORDER BY Vendor__r.Name];

             return result;
       }
    
   @AuraEnabled
    public static void updateOpportunityWithVendor(Id opportunityId, Id supplierOfferId, String category, String subCategory) {
        
    Supplier_Offer__c supplier = [SELECT Id, Vendor__r.Id 
                                  FROM Supplier_Offer__c
                                  WHERE Id = :supplierOfferId
                                  LIMIT 1];

    Opportunity oppToUpdate = new Opportunity(Id = opportunityId);

    if (supplier != null && supplier.Vendor__r != null) {
        oppToUpdate.AccountId = supplier.Vendor__r.Id;
    }

    oppToUpdate.Category_Picklist__c = category;
    oppToUpdate.Sub_Category_Picklist__c = subCategory;

    update oppToUpdate;
  }
    
    @AuraEnabled
    public static Id createOpportunity(Opportunity opportunityData){

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
        
        RecordType rt = [SELECT Id
                         FROM RecordType
                         WHERE SObjectType = 'Account'
                         AND DeveloperName = 'Competitor'];
        return rt.Id;
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
        
        if(!suppliers.isEmpty()) {
            return suppliers;
        }else {
            return suppliers;
        }
    }
    
    @AuraEnabled
    public static void updateSupplierOffers(List<Supplier_Offer__c> suppliers) {
        
    if (suppliers == null || suppliers.isEmpty()) return;
    List<Supplier_Offer__c> recordsToUpdate = new List<Supplier_Offer__c>();

    for (Supplier_Offer__c s : suppliers) {
        Supplier_Offer__c record = new Supplier_Offer__c(Id = s.Id);

        if (s.FOB_Location__c != null) record.FOB_Location__c = s.FOB_Location__c;
        if (s.Cost__c != null) record.Cost__c = s.Cost__c;
        if (s.Market__c != null) record.Market__c = s.Market__c;
        if (s.Freight__c != null) record.Freight__c = s.Freight__c;
        if (s.Quantity_per_Pallet__c != null) record.Quantity_per_Pallet__c = s.Quantity_per_Pallet__c;

        recordsToUpdate.add(record);
    }

    if (!recordsToUpdate.isEmpty()) {
        update recordsToUpdate;
    }
  }
}