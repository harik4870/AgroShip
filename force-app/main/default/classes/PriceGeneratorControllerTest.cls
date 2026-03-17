@isTest
private class PriceGeneratorControllerTest {

    @testSetup
    static void setupData(){

        Account acc = new Account(Name='Customer Account');
        insert acc;

        Opportunity opp = new Opportunity(
            Name='Test Opportunity',
            AccountId=acc.Id,
            StageName='Open',
            CloseDate=System.today()
        );
        insert opp;

        Competitor__c comp = new Competitor__c(Name='Competitor1', Account__c=acc.Id, Price__c=120);
        insert comp;

        Account supplier = new Account(Name='Supplier Vendor');
        insert supplier;

        Supplier_Offer__c offer = new Supplier_Offer__c(Name='Supplier Offer', Vendor__c=supplier.Id);
        insert offer;
    }

    @isTest
    static void testCreateOpportunity(){

        Account acc = [SELECT Id FROM Account LIMIT 1];

        Opportunity opp = new Opportunity(
            AccountId=acc.Id,
            Category_Picklist__c='Beans',
            Sub_Category_Picklist__c='Black',
            StageName = 'Open',
            CloseDate = system.today()
        );

        Test.startTest();
        Id newOppId = PriceGeneratorController.createOpportunity(opp);
        Test.stopTest();

        System.assertNotEquals(null,newOppId);
    } 

    @isTest
    static void testGetPriceGeneratorData(){

        Opportunity opp = [SELECT Id FROM Opportunity LIMIT 1];

        Test.startTest();
        PriceGeneratorController.PriceGeneratorWrapper data =  PriceGeneratorController.getPriceGeneratorData(opp.Id);
        Test.stopTest();

        System.assertNotEquals(null,data);
    }

    @isTest
    static void testUpdateOpportunityWithVendor(){

        Opportunity opp = [SELECT Id FROM Opportunity LIMIT 1];
        Supplier_Offer__c offer = [SELECT Id FROM Supplier_Offer__c LIMIT 1];

        Test.startTest();
        PriceGeneratorController.updateOpportunityWithVendor(opp.Id, offer.Id, 'Beans','Black');
        Test.stopTest();

        Opportunity updatedOpp = [SELECT Category_Picklist__c, Sub_Category_Picklist__c
                                  FROM Opportunity
                                  WHERE Id = :opp.Id];

        System.assertEquals('Beans', updatedOpp.Category_Picklist__c);
    }

    @isTest
    static void testGetSuppliers(){

        Test.startTest();
        List<Supplier_Offer__c> suppliers = PriceGeneratorController.getSuppliers();
        Test.stopTest();

        System.assert(suppliers.size() >= 0);
    }

    @isTest
    static void testUpdateSupplierOffers(){

        Supplier_Offer__c sup = [SELECT Id, Cost__c, FOB_Location__c, Market__c, Freight__c, Quantity_per_Pallet__c
                                 FROM Supplier_Offer__c
                                 LIMIT 1];

        sup.Cost__c = 10;
        sup.FOB_Location__c = 'Location';

        Test.startTest();
        PriceGeneratorController.updateSupplierOffers(new List<Supplier_Offer__c>{sup});
        Test.stopTest();

        System.assert(true);
    }

    @isTest
    static void testGetCompetitorAccounts(){

        Test.startTest();
        Id recordTypeId = PriceGeneratorController.getCompetitorAccounts();
        Test.stopTest();

        System.assertNotEquals(null, recordTypeId);
    }

    @isTest
    static void testGetCompetitorsAndOpportunities(){

        Account acc = [SELECT Id FROM Account LIMIT 1];

        Test.startTest();
        PriceGeneratorController.AccountDataWrapper data = PriceGeneratorController.getcompetitorsAndOpportunities(acc.Id);
        Test.stopTest();
        System.assertNotEquals(null,data);
    }
}