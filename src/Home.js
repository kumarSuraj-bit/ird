import React from "react";
import { useState } from "react";
import './Home.css'
import { CircularProgress, Button, TextField } from "@mui/material";
import * as cheerio from 'cheerio';

export default function Home(){

    const [isLoading, setIsLoading] = useState(false);
    const [url, setUrl] = useState("");
    const [error, setError] = useState(null);
    const [link, setLink] = useState(null);

    const urlChecker = (url) => {
        const reg = new RegExp("(https://www.instagram.com/(?:p|reel|tv)/[a-zA-Z0-9_-]{11}/)");
        const match = url.match(reg);
        return match;
    }

    async function scrapeHtmlFromUrl(url){
        const matching = await urlChecker(url);
        const urlApi = `${matching[0]}embed/`;
        console.log(urlApi);

        const res = await fetch(urlApi);

        console.log(res);
        const html = await res.text();
        return html;
    }

    async function getJsonFromHtml(html){
        let json = null;
        const $ = cheerio.load(html);

        $("script").each( (i,el ) => {
            const script = $(el).html();
            const reg = new RegExp("window\\.__additionalDataLoaded\\((.*)\\)");
            const match = script.match(reg);
            if(match){
                const res = match[1].replace("'extra',", "");
                json = JSON.parse(res);
            }
        });

        return json;
    }

    async function getUrlFromJson(json){
        const data = json.shortcode_media;
        const isSingle = (data.edge_sidecar_to_children) ? false : true;
    
        if (isSingle) {
            if(data.is_video){
                return [data.video_url];
            } else{
                return [data.display_url];
            }
        } else{
            const urls = [];
            data.edge_sidecar_to_children.edges.forEach(edge => {
                if(edge.node.is_video){
                    urls.push(edge.node.video_url);
                } else{
                    urls.push(edge.node.display_url);
                }
            });
            return urls;
        }
    }

    const getUrlFromHtml = async (html) => {
        const $ = cheerio.load(html);
        const url = $(".EmbeddedMediaImage").attr("src");
        return [url];
    }

    async function click(e){
        e.preventDefault();
        
        const matching = await urlChecker(url);
        if(!matching){
            return setError("URL is not valid");
        }

        try{
            setIsLoading(true);

            const html = await scrapeHtmlFromUrl(url);
            const json = await getJsonFromHtml(html);

            var urls = [];

            if(json){
                urls = await getUrlFromJson(json);
            }
            else{
                urls = await getUrlFromHtml(html);
            }
            
            console.log(urls);

            if(urls.length > 0){
                //downloadMediaFromUrl(urls);
                setLink(url[0]);
            }
            else{
                setError("Error getting download url");
            }
        } catch (err){
            console.error(err);
            setError("Error getting download url");
        }
        setIsLoading(false);
    }

    return(
        <div id="home">
            <div className="home--form">
                <form onSubmit={click} >
                    <div className="formInput">
                        <TextField
                            value={url}
                            required={true}
                            error={error == null ? false : true}
                            helperText={error}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="Paste Instagram post url"
                            className="input--url"
                        ></TextField>
                    </div>

                    <br />

                    <div className="formInput">
                        {isLoading ? (
                            <CircularProgress/>
                        ) : (
                            <Button className="form--button"
                                color="primary"
                                variant="contained"
                                type="submit"
                            >
                            Go!
                            </Button>
                        )}

                        {error == null ? (
                            link == null ? (
                                <div/>
                            ) : (
                            <div>
                                <a
                                    href={link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download
                                    style={{ textDecoration: "none" }}
                                    >
                                    <Button
                                        color="secondary"
                                        variant="contained"
                                    >
                                    Download File!
                                    </Button>
                                </a>
                            </div>
                            )
                        ) : (
                            <p></p>
                        )}
                    </div>
            
                </form>
            </div>
            <div id="home--note">
                <h4>Note: Only posts of public Instagram Accounts are downloaded</h4>
            </div>
        </div>
    );
}