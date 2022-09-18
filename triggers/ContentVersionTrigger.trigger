trigger ContentVersionTrigger on ContentVersion (before insert) {
    for (ContentVersion thisCV : trigger.new) {
        if (thisCV.sfs_related_record_id__c !=null) {
            ContentDocumentLink newCDL = new ContentDocumentLink(
                linkedEntityId = thisCV.sfs_related_record_id__c,
                contentDocumentId = thisCV.contentDocumentId,
                shareType = 'V' //Viewer permission. The user can explicitly view but not edit the shared file.
            );
            insert newCDL;
        }
    }
}