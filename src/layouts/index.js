import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useMediaQuery } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useSettings } from "../hooks/use-settings";
import { Footer } from "./footer";
import { MobileNav } from "./mobile-nav";
import { SideNav } from "./side-nav";
import { TopNav } from "./top-nav";
import { ApiGetCall } from "../api/ApiCall";
import { useDispatch } from "react-redux";
import { showToast } from "../store/toasts";
import { Box, Container, Grid } from "@mui/system";
import { CippImageCard } from "../components/CippCards/CippImageCard";

const SIDE_NAV_WIDTH = 270;
const SIDE_NAV_PINNED_WIDTH = 50;
const TOP_NAV_HEIGHT = 50;

const useMobileNav = () => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const handlePathnameChange = useCallback(() => {
    if (open) {
      setOpen(false);
    }
  }, [open]);

  useEffect(
    () => {
      handlePathnameChange();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathname]
  );

  const handleOpen = useCallback(() => {
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  return {
    handleClose,
    handleOpen,
    open,
  };
};

const LayoutRoot = styled("div")(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  display: "flex",
  flex: "1 1 auto",
  maxWidth: "100%",
  paddingTop: TOP_NAV_HEIGHT,
  [theme.breakpoints.up("lg")]: {
    paddingLeft: SIDE_NAV_WIDTH,
  },
}));

const LayoutContainer = styled("div")({
  display: "flex",
  flex: "1 1 auto",
  flexDirection: "column",
  width: "100%",
});

export const Layout = (props) => {
  const { children, allTenantsSupport = true } = props;
  const mdDown = useMediaQuery((theme) => theme.breakpoints.down("md"));
  const settings = useSettings();
  const mobileNav = useMobileNav();
  const [userSettingsComplete, setUserSettingsComplete] = useState(false);
  const [fetchingVisible, setFetchingVisible] = useState([]);
  const currentTenant = settings?.currentTenant;

  const handleNavPin = useCallback(() => {
    settings.handleUpdate({
      pinNav: !settings.pinNav,
    });
  }, [settings]);

  const offset = settings.pinNav ? SIDE_NAV_WIDTH : SIDE_NAV_PINNED_WIDTH;

  const userSettingsAPI = ApiGetCall({
    url: "/api/ListUserSettings",
    queryKey: "userSettings",
  });

  useEffect(() => {
    if (userSettingsAPI.isSuccess && !userSettingsAPI.isFetching && !userSettingsComplete) {
      settings.handleUpdate(userSettingsAPI.data);
      setUserSettingsComplete(true);
    }
  }, [
    userSettingsAPI.isSuccess,
    userSettingsAPI.data,
    userSettingsAPI.isFetching,
    userSettingsComplete,
    settings,
  ]);

  const version = ApiGetCall({
    url: "/version.json",
    queryKey: "LocalVersion",
  });

  const alertsAPI = ApiGetCall({
    url: `/api/GetCippAlerts?localversion=${version?.data?.version}`,
    queryKey: "alertsDashboard",
    waiting: false,
  });

  useEffect(() => {
    if (version.isFetched && !alertsAPI.isFetched) {
      alertsAPI.waiting = true;
      alertsAPI.refetch();
    }
  }, [version, alertsAPI]);

  useEffect(() => {
    if (alertsAPI.isSuccess && !alertsAPI.isFetching) {
      setFetchingVisible(new Array(alertsAPI.data.length).fill(true));
    }
  }, [alertsAPI.isSuccess, alertsAPI.data, alertsAPI.isFetching]);

  const dispatch = useDispatch();
  //if there are alerts, send them to our toast component
  useEffect(() => {
    if (alertsAPI.isSuccess && !alertsAPI.isFetching) {
      if (alertsAPI.data.length > 0) {
        alertsAPI.data.forEach((alert) => {
          dispatch(
            showToast({
              message: alert.Alert,
              title: alert.title,
              toastError: alert,
            })
          );
        });
      }
    }
  }, [alertsAPI.isSuccess]);

  return (
    <>
      <TopNav onNavOpen={mobileNav.handleOpen} openNav={mobileNav.open} />
      {mdDown && <MobileNav onClose={mobileNav.handleClose} open={mobileNav.open} />}
      {!mdDown && <SideNav onPin={handleNavPin} pinned={!!settings.pinNav} />}
      <LayoutRoot
        sx={{
          pl: {
            md: offset + "px",
          },
        }}
      >
        <LayoutContainer>
          {currentTenant === "AllTenants" && !allTenantsSupport ? (
            <Box sx={{ flexGrow: 1, py: 4 }}>
              <Container maxWidth={false}>
                <Grid container spacing={3}>
                  <Grid item size={6}>
                    <CippImageCard
                      title="Not supported"
                      imageUrl="/assets/illustrations/undraw_website_ij0l.svg"
                      text={
                        "The page does not support all Tenants, please select a different tenant using the tenant selector."
                      }
                    />
                  </Grid>
                </Grid>
              </Container>
            </Box>
          ) : (
            children
          )}
          <Footer />
        </LayoutContainer>
      </LayoutRoot>
    </>
  );
};