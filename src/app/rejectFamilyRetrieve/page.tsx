"use client";
import React from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert, { AlertProps } from "@mui/material/Alert";
import { decrypt, post } from "../util";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import * as clipboard from "clipboard-polyfill";
import { useSearchParams } from "next/navigation";

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref
) {
  return <MuiAlert elevation={6} ref={ref} variant='filled' {...props} />;
});

export default function Home() {
  const [loading, setLoading] = React.useState(false);
  const [toast, setToast] = React.useState("");
  const [errorToast, setErrorToast] = React.useState("");
  const searchParams = useSearchParams();
  const [result, setResult] = React.useState("");

  React.useEffect(() => {
    const retrieveUUID = searchParams.get("uuid");
    if (retrieveUUID) {
      post(
        false,
        "",
        "/pswds/rejectFamilyRetrieve/v1",
        setLoading,
        true,
        {
          uuid: retrieveUUID,
        },
        (respData: any) => {
          if (respData.code === 0) {
            setResult("Reject Successfully!");
          } else {
            setResult("Reject Unsuccessfully!");
          }
        },
        setToast,
        setErrorToast
      );
    } else {
      setResult("None Retrieve UUID");
    }
  }, [searchParams]);

  return (
    <main>
      <Stack marginX='200px' marginTop='50px' spacing={2}>
        <Stack direction='row' textAlign='center' justifyContent='left'>
          <Typography variant='h6' gutterBottom>
            {result}
          </Typography>
        </Stack>
      </Stack>
      <Snackbar
        open={errorToast !== ""}
        autoHideDuration={5000}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        onClose={() => setErrorToast("")}
      >
        <Alert
          onClose={() => setErrorToast("")}
          severity='error'
          sx={{ width: "100%" }}
        >
          {errorToast}
        </Alert>
      </Snackbar>
      <Snackbar
        open={toast !== ""}
        autoHideDuration={4500}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        onClose={() => setToast("")}
      >
        <Alert
          onClose={() => setToast("")}
          severity='success'
          sx={{ width: "100%" }}
        >
          {toast}
        </Alert>
      </Snackbar>
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={loading}
      >
        <CircularProgress color='inherit' />
      </Backdrop>
    </main>
  );
}
