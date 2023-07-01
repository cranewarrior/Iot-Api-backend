const nodemailer = require('nodemailer');
const emailConfig = require('../config/email.config');

const transporter = nodemailer.createTransport({
    service: emailConfig.server,
    auth: {
        user: emailConfig.username,
        pass: emailConfig.password
    }
});

const db = require("../models");
const User = db.user;
const UserGroup = db.userGroup;
const DeviceGroup = db.deviceGroup;

exports.getUserGroup = async (req, res) => {
    try {
        const userGroups = await UserGroup.find().populate("members", "username").populate("reference2devicegroup", "name");
        res.status(201).send(userGroups);
    } catch (err){
        res.status(401).send({ message: err.message });
    }
}

exports.createUserGroup = async (req, res) => {
    try {
        await UserGroup.create({ name: req.body.name });
        res.status(201).send({ message: "UserGroup created successfully" });
    } catch (err){
        res.status(401).send({ message: err.message });
    }
}

exports.deleteUserGroup = async (req, res) => {
    try {
        const data = await UserGroup.find({ _id: { $in: req.body.selectedGroups } });
        for (eachDevice of data) {
            for (each of eachDevice.members) {
                const device = await User.findById(each);
                device.group.pull(eachDevice_id);
                await device.save();
            }
            for (each of eachDevice.reference2devicegroup) {
                const device = await DeviceGroup.findById(each);
                device.group.pull(eachDevice_id);
                await device.save();
            }
        }
        const result = await UserGroup.deleteMany({ _id: { $in: req.body.selectedGroups } });
        res.status(200).send({ message: `${result.deletedCount} groups were deleted.` });
    } catch (err) {
        res.status(401).send({ message: err.message });
    }
}

exports.renameUserGroup = async (req, res) => {
    try {
        const result = await UserGroup.updateMany(
            { _id: { $in: req.body.selectedGroups } },
            { $set: { name: req.body.newName } }
        );
        res.status(201).send({ message: `${result.modifiedCount} groups renamed as ${req.body.newName}` });
    } catch (err) {
        res.status(401).send({ message: err.message });
    }
}

exports.updateUserGroup = async (req, res) => {
    try {
        const groupId = req.body.selected;
        const memberId = req.body.newMember;

        const group = await User.findById(groupId);
        const member = await  DeviceGroup.findById(memberId);

        if (!group || !member) {
            res.status(401).send({ message: "Invalid group Id or member Id" });
        }

        if (req.body.value == 'add') {
            if (!group.group.includes(memberId)) {
                member.reference2user.push(groupId);
                group.group.push(memberId);
                transporter.sendMail({
                    from: emailConfig.username,
                    to: group.email,
                    subject: 'You have been successfully added to User Group ' + member.name,
                    text: `Hi, ${group.username}.\n\n
                        You have been successfully added to User Group ${member.name}.\n 
                        Consequently, you now possess the ability to monitor the devices included in this group.\n\n
                        Thank you`
                }, function (error, info) {
                    if (error) {
                        console.log('Error:', error);
                    } else {
                        console.log('Email sent:');
                    }
                });
            }
        } else {
            member.reference2user.pull(groupId);
            group.group.pull(memberId);
            transporter.sendMail({
                from: emailConfig.username,
                to: group.email,
                subject: 'You have been revoked from User Group ' + member.name,
                text: `Hi, ${group.username}.\n\n
                    You have been revoked from User Group ${member.name}.\n 
                    Unfortunately, you no longer possess the capability to monitor the devices associated with this group. I apologize for any inconvenience caused.\n\n
                    Sorry`
            }, function (error, info) {
                if (error) {
                    console.log('Error:', error);
                } else {
                    console.log('Email sent:');
                }
            });
        }

        await member.save();
        await group.save();
        res.status(201).send({ message: `Added successfully` });
    } catch (err) {
        res.status(401).send({ message: err.message });
    }
}

exports.get4select = async (req, res) => {
    try {
        // const users = await User.find({},'username');
        const devices = await DeviceGroup.find({}, 'name');
        res.status(201).send({ devices: devices });
    } catch (err){
        res.status(401).send({ message: err.message });
    }
}