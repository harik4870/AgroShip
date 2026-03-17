@IsTest
private class IDATriggerHandlerTest {

    @IsTest
    static void testInsertUpdateDeleteAndReparent() {

        Account acc1 = new Account(Name = 'General Mills');
        Account acc2 = new Account(Name = 'Pepsico');
        insert new List<Account>{acc1, acc2};

        IDA__c ida = new IDA__c(Name = 'Sugar IDA', Account__c = acc1.Id);
        insert ida;

        acc1 = [SELECT IDA_exists__c FROM Account WHERE Id = :acc1.Id];
        System.assertEquals(true, acc1.IDA_exists__c);

        ida.Account__c = acc2.Id;
        update ida;

        acc1 = [SELECT IDA_exists__c FROM Account WHERE Id = :acc1.Id];
        acc2 = [SELECT IDA_exists__c FROM Account WHERE Id = :acc2.Id];

        System.assertEquals(false, acc1.IDA_exists__c);
        System.assertEquals(true, acc2.IDA_exists__c);
        delete ida;

        acc2 = [SELECT IDA_exists__c FROM Account WHERE Id = :acc2.Id];
        System.assertEquals(false, acc2.IDA_exists__c);
    }
}