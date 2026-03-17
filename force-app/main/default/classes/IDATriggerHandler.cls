public with sharing class IDATriggerHandler {

    public static void updateAccount(List<IDA__c> newList, Map<Id, IDA__c> oldMap) {

        Set<Id> accountIds = new Set<Id>();
        Map<Id, Integer> accountCountMap = new Map<Id, Integer>();
        List<Account> accountsToUpdate = new List<Account>();

        if(newList != null){
            for(IDA__c ida : newList){
                if(ida.Account__c != null){
                    accountIds.add(ida.Account__c);
                }
                if(oldMap != null){
                    if(oldMap != null && oldMap.get(ida.Id).Account__c != null && oldMap.get(ida.Id).Account__c != ida.Account__c){
                        accountIds.add(oldMap.get(ida.Id).Account__c);
                    }
                }
            }
        }
        
        if(oldMap != null && newList == null){
            for(IDA__c oldRec : oldMap.values()){
                if(oldRec.Account__c != null){
                    accountIds.add(oldRec.Account__c);
                }
            }
        }

        if(accountIds.isEmpty()){
            return;
        }

        for(AggregateResult ar : [SELECT Account__c accId, COUNT(Id) total
                                  FROM IDA__c
                                  WHERE Account__c IN :accountIds
                                  GROUP BY Account__c]){
            accountCountMap.put((Id) ar.get('accId'), (Integer) ar.get('total'));
        }

        for(Account acc : [SELECT Id, IDA_exists__c
                           FROM Account
                           WHERE Id IN :accountIds]){

            if(acc.IDA_exists__c != accountCountMap.containsKey(acc.Id)){
                acc.IDA_exists__c = accountCountMap.containsKey(acc.Id);
                accountsToUpdate.add(acc);
            }
        }

        if(!accountsToUpdate.isEmpty()){
            update accountsToUpdate;
        }
    }
}