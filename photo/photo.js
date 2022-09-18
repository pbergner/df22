import { api,track,LightningElement} from 'lwc';
import {createRecord} from 'lightning/uiRecordApi';

export default class ImageUploadExample extends LightningElement {
    // This allows the component to be placed on a record page, or other record
    // context, and receive the record's ID when it runs
    @api recordId;
    // Internal component state; resets when component is reloaded, etc.
    @track processedData = [];
   
    // Component configuration: image size, format, and compression quality level
    IMAGE_MAX_DIMENSION_PIXELS = 2048;
    IMAGE_UPLOAD_FORMAT = 'image/jpeg';
    IMAGE_COMPRESSION_QUALITY = 0.75

    // UX event handler; fires after files are selected
    async handleFilesSelected(event) {
        try {
            let files = event.target.files;
            let numFiles = files.length;
            // Process and upload all files selected by user
            for (let i = 0; i < numFiles; i++) {

                let data = await this.readFile(files[i]);

                data = await this.resizeImage(files[i], data,
                    this.IMAGE_MAX_DIMENSION_PIXELS, this.IMAGE_COMPRESSION_QUALITY);

                await this.uploadData(files[i], data, this.recordId);

                this.processedData.push({
                    id: (this.processedData.length + 1),
                    data: data
                });
            }
        } 
        catch (error) {
            console.error("ERROR: ", error)
        }
    }
    // Read image data from a file selected in a browser
    // This is standard JavaScript, not unique to LWC
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = ev => {
                resolve(ev.target.result);
            }
            reader.onerror = ev => {
                reject(`There was an error reading file: ${file.name}`);
            }
            reader.readAsDataURL(file);
        });
    }
    // Resize an image; again, standard JavaScript techniques only
    resizeImage(file, data, maxSize, compressionQuality) {
        return new Promise((resolve, reject) => {
            if (file.type.startsWith("image/")) {
                let image = new Image();

                image.onload = function() {
                    // Check if the image even needs resizing
                    const shouldResize =
                        (image.width > maxSize) || (image.height > maxSize);
                    // If resizing is needed, calculate resized image size in pixels,
                    // preserving aspect ratio
                    let finalWidth = image.width;
                    let finalHeight = image.height;
                    if (shouldResize) {
                        if (image.width > image.height) {
                            finalWidth = maxSize
                            finalHeight = image.height * (maxSize / image.width);
                        } else {
                            finalWidth = image.width * (maxSize / image.height);
                            finalHeight = maxSize;
                        }
                    }
                    // Render image into offscreen canvas at calculated size
                    // This is a lossy process when resolution is reduced
                    let canvas = document.createElement('canvas');
                    canvas.width = finalWidth;
                    canvas.height = finalHeight;
                    canvas.getContext('2d').drawImage(this,
                        0, 0, finalWidth, finalHeight);
                    // Convert resized image to a data URL
                    // This is a lossy process when compressing to JPEG format
                    let resizedData = canvas.toDataURL(this.IMAGE_UPLOAD_FORMAT,
                        compressionQuality);
                    resolve(resizedData);
                }
                image.onerror = function() {
                    reject(`There was an error resizing file: ${file.name}`);
                }
                image.src = data;
            } else {
                resolve(data);
            }
        });
    }
    // Use LDS createRecord function to upload file to a ContentVersion object.
    // ContentVersion is the standard representation of an uploaded file in
    // Salesforce.
    uploadData(file, data, recordId) {
        return createRecord({
            apiName: 'ContentVersion',
            fields: {
                'Title': file.name,
                'PathOnClient': file.name,
                'VersionData': data.split(',')[1], // extract base64 part of data
                'Origin': 'H',
                // Custom field, which you must create on ContentVersion to assist trigger in related to record
                'SFS_Related_Record_ID__c': recordId
            }
        }).then((contentVersion) => {

            console.log(`File uploaded, ContentVersion.Id: ${contentVersion.Id}`);
            console.log(`Associate with: ${contentVersion.SFS_Related_Record_ID__c}`);
        });
    }
}