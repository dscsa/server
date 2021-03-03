const filesystem = require('fs');
module.exports = class Group {

    constructor(groupName){
        if(!groupName){
            throw new Error('Group name cannot be empty');
        }

        this.groupName = groupName;

        if(this.isLocked()){
            let currentValues = JSON.parse(this.lockFileContent());

            for(const [property, value] of Object.entries(currentValues)){
                this[property] = value;
            }
        }
    }

    generateLockFileContent(){
        let content = {},
            fields = ['groupName', 'basket', 'user'];

        //gather relevent fields and return json object
        fields.forEach((fieldName) => {
            if(this[fieldName]){
                content[fieldName] = this[fieldName];
            }
        });

        return JSON.stringify(content);
    }

    lockFileContent(){
        return filesystem.readFileSync(this.lockFilePath(), 'utf8');
    }

    lockFilePath(){
        return this.lockFileFolder() + this.groupName;

    }

    lockFileFolder(){
        return `${__dirname}/../store/`;
    }


    write(){
        if(!filesystem.existsSync(this.lockFileFolder())){
            filesystem.mkdirSync(this.lockFileFolder());
        }
        
        filesystem.writeFileSync(this.lockFilePath(), this.generateLockFileContent());
        console.log(this.lockFileContent());
        console.trace();
    }


    setIfLocked(fieldName, fieldValue){
        if(this.isLocked()){
            this[fieldName] = fieldValue;
            this.write();
        }
        else{
            throw new Error(`Lock file doesn't exist. Unable to write ${fieldName} = ${fieldValue}`);
        }
    }

    lock(userLockedBy){
        let date = new Date(),
            months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Nov', 'Dec'],
            minutes = date.getMinutes(),
            hours = date.getHours(),
            ampm = hours >= 12 ? 'pm' : 'am';

        hours = hours % 12;

        // the hour '0' should be '12'  ;
        if(hours === 0)
            hours = 12;

        minutes = minutes < 10 ? '0'+minutes : minutes;

        userLockedBy.date = `${months[date.getMonth() + 1]}-${date.getDate()}`;
        userLockedBy.time = `${hours}:${minutes}${ampm}`;
        userLockedBy.fullTime = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear().toString().substring(2)} ${hours}:${minutes}${date.getSeconds()}${ampm}`;

        this.user = userLockedBy;

        if(!this.isLocked()){
            this.write();
        }
        else {
            throw new Error('Already locked');
        }
    }

    unlock(){
        if(this.isLocked()){
            filesystem.unlinkSync(this.lockFilePath());
        }
    }

    setBasketNumber(basketNumber){
        this.setIfLocked('basket', basketNumber);
    }

    isLocked(){
        return filesystem.existsSync(this.lockFilePath());
    }

    userIsOwner(user){
        return this.isLocked() && this.user._id && (this.user._id  === user._id);
    }
};