trigger IDATrigger on IDA__c (after insert, after update, after delete, after undelete) {

  if(Trigger.isAfter) {
    if(Trigger.isInsert || Trigger.isUpdate || Trigger.isUndelete) {
        IDATriggerHandler.updateAccount(Trigger.new, Trigger.oldMap);
    }

    if(Trigger.isDelete) {
        IDATriggerHandler.updateAccount(null, Trigger.oldMap);
    }
  }
}