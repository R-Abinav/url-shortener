import { nanoid } from "nanoid";
import URL from "../models/url.js";

export async function generateShortUrl(req, res){
    const body = req.body;
    if(!body || !body.url){
        return res.status(400).json({ error: "Please enter the URL!!" });
    }

    const shortID = nanoid(8);

    await URL.create({
        shortId: shortID,
        redirectURL: body.url,
        visitHistory: [] 
    });

    return res.status(201).json({ status: "success", id: shortID });
}

export async function redirectToOriginal(req, res){
    const shortId = req.params.shortId;

    const entry = await URL.findOneAndUpdate({
        shortId
    }, 
    {
        $push:{
            visitHistory: {
                timestamp: Date.now()
            }
        }
    });

    res.redirect(entry.redirectURL);
}

export async function generateAnalytics(req,res){
    const shortId = req.params.shortId;

    const entry = await URL.findOne({shortId});

    if(!entry){
        return res.status(404).json({ error: "url with the given shortId not found!" });
    }

    const returnJson = {
        totalClicks: entry.visitHistory.length,
        visitHistory: entry.visitHistory
    }

    return res.status(200).json(returnJson);
}