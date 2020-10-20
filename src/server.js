import express from "express";
import multer from "multer";
import multerS3 from "multer-s3";
import aws from "aws-sdk";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import Cookie from "js-cookie";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import cookie from "cookie";


const app = express();
app.use(cookieParser());
app.use(bodyParser.json());

// http://localhost:3000(frontend에서 localhost:5000이 들어오게 하는것을 허락하는 코드)
app.use(cors());

dotenv.config({ path: path.join(__dirname, "../.env") });

const port =  process.env.PORT || 5000;

const s3 = new aws.S3({
  accessKeyId: process.env.AWS_KEY,
  secretAccessKey: process.env.AWS_PRIVATE_KEY,
  region: "ap-northeast-1"
});

const postMulterBoth = multer({
  storage: multerS3({
    s3,
    acl: "public-read",
    bucket: "weberyday-test"
  })
});

const episodeMulterBoth = multer({
  storage: multerS3({
    s3,
    acl: "public-read",
    bucket: "weberyday-test"
  })
});

const notificationMulter = multer({
  storage: multerS3({
    s3,
    acl: "public-read",
    bucket: "weberyday-test"
  })
});

const bannerMulterBoth = multer({
  storage: multerS3({
    s3,
    acl: "public-read",
    bucket: "weberyday-test"
  })
});

//const uploadImage = postMulterBoth.single("imgFile");
const postUploadboth = postMulterBoth.any();
const episodeUploadboth = episodeMulterBoth.any();
const notificaitonUpload = episodeMulterBoth.single("imgFile");
const bannerUploadboth = bannerMulterBoth.any();

//작품을 등록하려고 했다가 토큰을 조작하여 그냥 바로 redirect시키기 위한 코드
app.post("/", (req, res, next) => {
  res.redirect("https://weberyday.netlify.app/");
});

//작품 등록할때
app.post("/uploadPost", postUploadboth, function (req, res, next) {
  const value = req.files;
  console.log(value);

  //s3에 업로드된 정보들
  res.cookie("postThumnail", value[0].location);
  res.cookie("postBackgroundImg", value[1].location);

  //s3에 저장되는 key정보를 해당 post에도 담기위한 작업
  res.cookie("s3PostThumnailId", value[0].key);
  res.cookie("s3PostBackgroundImgId", value[1].key);

  res.redirect(`https://weberyday.netlify.app/#/myPostList?postThumnail=${value[0].location}&postBackgroundImg=${value[1].location}&s3PostThumnailId=${value[0].key}&s3PostBackgroundImgId=${value[1].key}`);
});

//작품수정할때
app.post("/myPostUpdate/:id", postUploadboth, function (req, res, next) {
  let postId = req.url.split("/")[2];
  const value = req.files;

  //s3에서 있는 기존의 내용을 삭제하기 위함
  const dbS3Thumbnail = req.query.s3Thumbnail;
  const dbS3BackgroundImage = req.query.s3BackgroundImage;
  console.log(req.query);

  if (value.length === 1) {
    if (value[0].fieldname === "postThumnail") {
      res.cookie("postThumnail", value[0].location);
      res.cookie("s3PostThumnailId", value[0].key);

      res.cookie("postBackgroundImg", "");
      res.cookie("s3PostBackgroundImgId", "");

      var params = {
        Bucket: "weberyday-test",
        Key: dbS3Thumbnail
      };

      s3.deleteObject(params, (err, data) => {
        if (err) console.log("error", err, err.stack);
        // an error occurred
        else console.log("data", data);
      });

      req.query = "";
      console.log(query);
      res.redirect(`https://weberyday.netlify.app/#/myPostList/${postId}?postThumnail=${value[0].location}&s3PostThumnailId=${value[0].key}`);
    }
    else if (value[0].fieldname === "postBackgroundImg") {
      res.cookie("postBackgroundImg", value[0].location);
      res.cookie("s3PostBackgroundImgId", value[0].key);

      res.cookie("postThumnail", "");
      res.cookie("s3PostThumnailId", "");

      var params = {
        Bucket: "weberyday-test",
        Key: dbS3BackgroundImage
      };

      s3.deleteObject(params, (err, data) => {
        if (err) console.log("error", err, err.stack);
        // an error occurred
        else console.log("data", data);
      });

      res.redirect(`https://weberyday.netlify.app/#/myPostList/${postId}?postBackgroundImg=${value[0].location}&s3PostBackgroundImgId=${value[0].key}`);
    }
  } else {
    res.cookie("postThumnail", value[0].location);
    res.cookie("postBackgroundImg", value[1].location);
    res.cookie("s3PostThumnailId", value[0].key);
    res.cookie("s3PostBackgroundImgId", value[1].key);

    var params = {
      Bucket: "weberyday-test",
      Delete: {
        Objects: [
          {
            Key: dbS3Thumbnail
          },
          {
            Key: dbS3BackgroundImage
          }
        ],
        Quiet: false
      }
    };

    s3.deleteObjects(params, (err, data) => {
      if (err) console.log("error", err, err.stack);
      // an error occurred
      else console.log("data", data);
    });
    res.redirect(`https://weberyday.netlify.app/#/myPostList/${postId}?postThumnail=${value[0].location}&postBackgroundImg=${value[1].location}&s3PostThumnailId=${value[0].key}&s3PostBackgroundImgId=${value[1].key}`);
  }
});

//작품 삭제할때
app.post("/myPostDelete", (req, res, next) => {
  const s3Thumbnail = req.query.s3Thumbnail;
  const s3BackgroundImage = req.query.s3BackgroundImage;

  var params = {
    Bucket: "weberyday-test",
    Delete: {
      Objects: [
        {
          Key: s3Thumbnail
        },
        {
          Key: s3BackgroundImage
        }
      ],
      Quiet: false
    }
  };

  s3.deleteObjects(params, (err, data) => {
    if (err) console.log("error", err, err.stack);
    // an error occurred
    else console.log("data", data);
  });
});

//작품 회차 등록할때
app.post("/uploadEpisode/:id", episodeUploadboth, function (req, res, next) {
  const value = req.files;

  let postId = req.url.split("/")[2];
  res.cookie("episodeImgFile", value[0].location);
  res.cookie("videoFile", value[1].location);
  //s3에 저장될 cookie를 생성
  res.cookie("s3EpisodeImgFile", value[0].key);
  res.cookie("s3VideoFile", value[1].key);

  res.redirect(`https://weberyday.netlify.app/#/myPostList/${postId}`);
});

//작품 회차 수정할때
app.post("/updateEpisode/:id", episodeUploadboth, function (req, res, next) {
  const value = req.files;
  let episodeId = req.url.split("/")[2];

  //s3에 있는 정보를 url을 통해 가져옴
  const s3ThumbnailId = req.query.s3ThumbnailId;
  const s3FileId = req.query.s3FileId;

  if (value.length === 1) {
    if (value[0].fieldname === "videoFile") {
      res.cookie("videoFile", value[0].location);
      res.cookie("s3FileId", value[0].key);

      res.cookie("episodeImgFile", "");
      res.cookie("s3ThumbnailId", "");

      var params = {
        Bucket: "weberyday-test",
        Key: s3FileId
      };

      s3.deleteObject(params, (err, data) => {
        if (err) console.log("error", err, err.stack);
        // an error occurred
        else console.log("data", data);
      });
    }
    if (value[0].fieldname === "postThumnail") {
      res.cookie("episodeImgFile", value[0].location);
      res.cookie("s3ThumbnailId", value[0].key);

      res.cookie("videoFile", "");
      res.cookie("s3FileId", "");

      var params = {
        Bucket: "weberyday-test",
        Key: s3ThumbnailId
      };

      s3.deleteObject(params, (err, data) => {
        if (err) console.log("error", err, err.stack);
        // an error occurred
        else console.log("data", data);
      });
    }
  } else {
    res.cookie("episodeImgFile", value[0].location);
    res.cookie("videoFile", value[1].location);
    res.cookie("s3ThumbnailId", value[0].key);
    res.cookie("s3FileId", value[1].key);

    var params = {
      Bucket: "weberyday-test",
      Delete: {
        Objects: [
          {
            Key: s3ThumbnailId
          },
          {
            Key: s3FileId
          }
        ],
        Quiet: false
      }
    };

    s3.deleteObjects(params, (err, data) => {
      if (err) console.log("error", err, err.stack);
      // an error occurred
      else console.log("data", data);
    });
  }

  res.redirect(`https://weberyday.netlify.app/#/episodeUpdate/${episodeId}`);
});

//회차 삭제 s3코드
app.post("/deleteEpisode/:id", function (req, res, next) {
  const postId = req.query.postId;
  const s3ThumbnailId = req.query.s3ThumbnailId;
  const s3FileId = req.query.s3FileId;

  var params = {
    Bucket: "weberyday-test",
    Delete: {
      Objects: [
        {
          Key: s3ThumbnailId
        },
        {
          Key: s3FileId
        }
      ],
      Quiet: false
    }
  };

  s3.deleteObjects(params, (err, data) => {
    if (err) console.log("error", err, err.stack);
    // an error occurred
    else console.log("data", data);
  });

  res.redirect(`https://weberyday.netlify.app/#/myPostList/${postId}`);
});

//관리자 알림 이미지 업로드
app.post("/notificationManage", notificaitonUpload, function (req, res, next) {
  const value = req.file;

  //s3에 저장될 cookie를 생성
  res.cookie("notificationImgFile", value.location);
  res.cookie("s3NotificationImgFile", value.key);

  res.redirect(`https://weberyday.netlify.app/#/notificationManage`);
});

//알림 수정 할때
app.post("/notificationUpdateManage", notificaitonUpload, function (
  req,
  res,
  next
) {
  const value = req.file;
  const s3NotificationId = req.query.s3NotificationId;

  //s3에 저장될 cookie를 생성
  res.cookie("notificationUpdateImgFile", value.location);
  res.cookie("s3NotificationUpdateImgFile", value.key);

  if (s3NotificationId === "") {
  } else {
    var params = {
      Bucket: "weberyday-test",
      Key: s3NotificationId
    };

    s3.deleteObject(params, (err, data) => {
      if (err) console.log("error", err, err.stack);
      // an error occurred
      else console.log("data", data);
    });
  }

  res.redirect(`https://weberyday.netlify.app/#/notificationManage`);
});

//알림 삭제할때
app.post("/notificationDelete", (req, res, next) => {
  const s3NotificationKey = req.query.s3NotificationKey;

  var params = {
    Bucket: "weberyday-test",
    Key: s3NotificationKey
  };

  s3.deleteObject(params, (err, data) => {
    if (err) console.log("error", err, err.stack);
    // an error occurred
    else console.log("data", data);
  });

  res.redirect(`https://weberyday.netlify.app/#/notificationManage`);
});

//카카오로그인
var passport = require("passport"),
  KakaoStrategy = require("passport-kakao").Strategy;

passport.use(
  new KakaoStrategy(
    {
      clientID: process.env.KAKAO_REST_API,
      callbackURL: process.env.KAKAO_CALL_BACK_URL
    },
    function (accessToken, refreshToken, profile, done) {
      // 사용자의 정보는 profile에 들어있다.
      return done(null, profile);
    }
  )
);

app.get("/login/kakao", passport.authenticate("kakao"));
app.use(passport.initialize());

app.get("/login/kakao/callback", function (req, res, next) {
  passport.authenticate("kakao", function (err, user) {
    if (!user) {
      return res.redirect("https://weberyday.netlify.app/#/kakaoLogin/fail");
    }
    req.logIn(user, function (err) {
      const current_kakaoUser = user._json.kakao_account.email;

      return res.redirect(`https://weberyday.netlify.app/#/?current_kakaoUser=${current_kakaoUser}`);
    });
  })(req, res);
});

//네이버 로그인
var NaverStrategy = require("passport-naver").Strategy;

passport.use(
  new NaverStrategy(
    {
      clientID: process.env.NAVER_REST_API,
      clientSecret: process.env.NAVER_CLIENT_SECRET,
      callbackURL: process.env.NAVER_CALL_BACK_URL
    },
    function (accessToken, refreshToken, profile, done) {
      return done(null, profile);
    }
  )
);
app.get("/login/naver", passport.authenticate("naver"));
app.use(passport.initialize());

app.get("/login/naver/callback", function (req, res, next) {
passport.authenticate("naver", function  (err, user) {
    if (!user) {
      return res.redirect("https://weberyday.netlify.app/naverLogin/fail");
    }
    req.logIn(user, function (err) {
      const current_NaverUser = user._json.email;
      
      return res.redirect(`https://weberyday.netlify.app/#/?current_NaverUser=${current_NaverUser}`);
    });
  })(req, res);
});

//facebook Login
var FacebookStrategy = require("passport-facebook").Strategy;

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,

      //ngrok의 https를 사용하는 중
      //env도 고쳐줘야함
      callbackURL: process.env.FACEBOOK_CALL_BACK_URL,
      profileFields: [
        "id",
        "email",
        "gender",
        "link",
        "locale",
        "name",
        "timezone",
        "updated_time",
        "verified",
        "displayName"
      ]
    },

    function (accessToken, refreshToken, profile, done) {
      passport.serializeUser(function (user, done) {
        done(null, user);
      });

      passport.deserializeUser(function (user, done) {
        done(null, user);
      });

      return done(null, profile);
    }
  )
);

app.get(
  "/auth/facebook",
  passport.authenticate("facebook", { scope: "email" })
);

app.get("/auth/facebook/callback", function (req, res, next) {
  passport.authenticate("facebook", function (err, user) {
    if (!user) {
      return res.redirect("https://weberyday.netlify.app/#/facebookLogin/fail");
    }
    req.logIn(user, function (err) {
      let fbEmail = "";
      if (user._json.email !== undefined && user._json.email !== "") {
        fbEmail = user._json.email;
        Cookie.set("current_FacebookUser", fbEmail);
        return res.redirect(`https://weberyday.netlify.app/#/?fbEmail=${fbEmail}`);
      } else {
        Cookie.set("current_FacebookUser", user.id);
        return res.redirect(`https://weberyday.netlify.app/#/?fbEmail=${user.id}`);
      }
    });
  })(req, res);
});

//배너 CRUD
app.post("/bannerManage", bannerUploadboth, function (req, res, next) {
  const file = req.files[0];

  try {
    if (req.query.image !== undefined) {
      const dbS3BannerKey = req.query.imageKey;

      let params = {
        Bucket: "weberyday-test",
        Key: dbS3BannerKey
      };

      s3.deleteObject(params, (err, data) => {
        if (err) console.log("error", err, err.stack);
        else console.log("data : ", data);
      });
    }

    const dbS3BannerKey = req.query.imageKey;

    if (file !== undefined) {
      res.cookie("banner=" + file.location);
      res.cookie("bannerImageKey=" + file.key);

      let params = {
        Bucket: "weberyday-test",
        Key: dbS3BannerKey
      };

      s3.deleteObject(params, (err, data) => {
        if (err) console.log("error", err, err.stack);
        else console.log("data : ", data);
      });
    }
  } catch (e) {
    console.log(e);
  }

  return res.redirect("http://localhost:3000/bannerManage");
});

app.listen(port, () =>
  console.log(`🔥Listening on Server: http//localhost:${port}🍓`)
);
