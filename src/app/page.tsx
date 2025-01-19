"use client";
import * as React from "react";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert, { AlertProps } from "@mui/material/Alert";
import Backdrop from "@mui/material/Backdrop";
import { TransitionProps } from "@mui/material/transitions";
import Slide from "@mui/material/Slide";
import { post, aes256GCM_secp256k1Decrypt } from "@/app/util";
import * as secp from "@noble/secp256k1";
import QRCode from "qrcode";
import OutlinedInput from "@mui/material/OutlinedInput";
import InputLabel from "@mui/material/InputLabel";
import InputAdornment from "@mui/material/InputAdornment";
import FormControl from "@mui/material/FormControl";
import * as clipboard from "clipboard-polyfill";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import IconButton from "@mui/material/IconButton";

interface Options {
  title: string;
  url: string;
  usernameOrEmail: string;
}

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

export default function Page() {
  const [loading, setLoading] = React.useState(false);
  const [toast, setToast] = React.useState("");
  const [errorToast, setErrorToast] = React.useState("");
  const [uuid, setUuid] = React.useState("");
  const [privKey, setPrivKey] = React.useState<null | Uint8Array>(null);
  const [plainPassword, setPlainPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleMouseDownPassword = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
  };
  const handleMouseUpPassword = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
  };
  const [options, setOptions] = React.useState<null | Options>(null);
  const generateQR = () => {
    // 1. fetch uuid from backend
    post(
      false,
      "",
      "/pswds/getUUID/v1",
      setLoading,
      true,
      undefined,
      (respData: any) => {
        if (respData.data) {
          if (respData.data.uuid !== "") {
            setUuid(respData.data.uuid);
            // 2. generate ECIES keys
            const _privKey = secp.utils.randomPrivateKey();
            setPrivKey(_privKey);
            const pubKey = secp.getPublicKey(_privKey, false);
            const pubKeyHex = Buffer.from(pubKey).toString("hex");
            // 3. generate QR
            const canvas = document.getElementById("canvas");
            QRCode.toCanvas(
              canvas,
              JSON.stringify({
                uuid: respData.data.uuid,
                publicKey: pubKeyHex,
              }),
              (error) => {
                if (error) setErrorToast(error.message);
              }
            );
            // 4-1. request password
            const timer = setInterval(async () => {
              const result = await post(
                false,
                "",
                "/pswds/requestPassword/v1",
                setLoading,
                true,
                { uuid: respData.data.uuid }
              );
              if (result.code !== 0) {
                clearInterval(timer);
                setErrorToast(result.message);
                return;
              }
              if (result.data) {
                if (result.data.cipherText) {
                  clearInterval(timer);
                  // 4-2. decrypt the cipher text
                  const ciphertext = Buffer.from(result.data.cipherText, "hex");
                  const plaintext = Buffer.from(
                    aes256GCM_secp256k1Decrypt(
                      _privKey,
                      new Uint8Array(
                        ciphertext.buffer,
                        ciphertext.byteOffset,
                        ciphertext.length
                      )
                    )
                  ).toString("utf-8");
                  if (plaintext) {
                    setPlainPassword(plaintext);
                  }
                }
                if (result.data.options) {
                  setOptions(JSON.parse(result.data.options));
                }
              }
            }, 5000);
          }
        }
      },
      setToast,
      setErrorToast
    );
  };
  const copyToClipboard = (text: string) => {
    clipboard.writeText(text);
  };

  return (
    <Stack
      spacing={5}
      direction="column"
      alignItems="center"
      sx={{
        padding: "1rem",
      }}
    >
      <Button
        size="large"
        variant="contained"
        onClick={() => {
          setPlainPassword("");
          generateQR();
        }}
      >
        Generate
      </Button>
      <Stack spacing={2} alignItems="center" direction="row">
        <canvas id="canvas"></canvas>
      </Stack>
      {plainPassword && (
        <>
          <Stack spacing={2} alignItems="center" direction="row">
            <FormControl sx={{ m: 1, width: 500 }} variant="outlined">
              <InputLabel htmlFor="outlined-adornment-title">Title</InputLabel>
              <OutlinedInput
                id="outlined-adornment-title"
                value={options?.title}
                label="Title"
              />
            </FormControl>
            <Button
              sx={{ visibility: "hidden" }}
              size="large"
              variant="contained"
              onClick={() => {}}
            >
              Copy
            </Button>
          </Stack>
          <Stack spacing={2} alignItems="center" direction="row">
            <FormControl sx={{ m: 1, width: 500 }} variant="outlined">
              <InputLabel htmlFor="outlined-adornment-url">URL</InputLabel>
              <OutlinedInput
                value={options?.url}
                id="outlined-adornment-url"
                label="URL"
              />
            </FormControl>
            <Button
              sx={{ visibility: "hidden" }}
              size="large"
              variant="contained"
              onClick={() => {}}
            >
              Copy
            </Button>
          </Stack>
          <Stack spacing={2} alignItems="center" direction="row">
            <FormControl sx={{ m: 1, width: 500 }} variant="outlined">
              <InputLabel htmlFor="outlined-adornment-username">
                UsernameOrEmail
              </InputLabel>
              <OutlinedInput
                value={options?.usernameOrEmail}
                id="outlined-adornment-username"
                label="UsernameOrEmail"
              />
            </FormControl>
            <Button
              size="large"
              variant="contained"
              onClick={() => {
                copyToClipboard(options ? options.usernameOrEmail : "");
              }}
            >
              Copy
            </Button>
          </Stack>
          <Stack spacing={2} alignItems="center" direction="row">
            <FormControl sx={{ m: 1, width: 500 }} variant="outlined">
              <InputLabel htmlFor="outlined-adornment-password">
                Password
              </InputLabel>
              <OutlinedInput
                value={plainPassword}
                id="outlined-adornment-password"
                type={showPassword ? "text" : "password"}
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={
                        showPassword
                          ? "hide the password"
                          : "display the password"
                      }
                      onClick={handleClickShowPassword}
                      onMouseDown={handleMouseDownPassword}
                      onMouseUp={handleMouseUpPassword}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                }
                label="Password"
              />
            </FormControl>
            <Button
              size="large"
              variant="contained"
              onClick={() => {
                copyToClipboard(plainPassword);
              }}
            >
              Copy
            </Button>
          </Stack>
        </>
      )}
      <Snackbar
        open={errorToast !== ""}
        autoHideDuration={5000}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        onClose={() => setErrorToast("")}
      >
        <Alert
          onClose={() => setErrorToast("")}
          severity="error"
          sx={{ width: "100%" }}
        >
          {errorToast}
        </Alert>
      </Snackbar>
      <Snackbar
        open={toast !== ""}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        onClose={() => setToast("")}
      >
        <Alert
          onClose={() => setToast("")}
          severity="success"
          sx={{ width: "100%" }}
        >
          {toast}
        </Alert>
      </Snackbar>
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={loading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </Stack>
  );
}
