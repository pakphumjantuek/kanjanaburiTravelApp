
export type RootStackParamList = {
  //หน้าแรก
  HomeScreen: undefined;
  //ผู้ใช้
  ProfileScreen: undefined;
  UserListScreen: undefined;
  UserProfileScreen: { userId: string };
  UserInterestDetailsScreen: { userId: string };
  Login: undefined;
  Register: undefined;
  //สถานที่
  PlaceList: undefined;
  PlaceDetails: { placeId: string };
  PlaceFormScreen: { mode: "add" } | { mode: "edit"; placeId: string };
  PlaceMenuManageScreen: { placeId: string };

  //ทริป
  TripListScreen: undefined;
  TripCreateScreen: undefined;
  TripDetailScreen: { tripId: string };
  TripPlannerScreen: { tripId: string };
  TripMapScreen: { tripId: string };
  AutoTripCreateScreen: undefined;
  //ผู้ดูแลระบบ
  AdminScreen: undefined;
  RoleList: undefined;
  RoleForm: { mode: "add" } | { mode: "edit"; roleId: number };
  PlaceListAdminScreen: undefined;

  PlaceTagListScreen: undefined;
  PlaceTagForm: { mode: "add" } | { mode: "edit"; placeTagId: number };

  PlaceCategoryListScreen: undefined;
  PlaceCategoryFormScreen:
    | { mode: "add" }
    | { mode: "edit"; placeCategoryId: number };

  PlaceOpeningScreen: { placeId: string };
  RecommendAdminScreen: undefined;

  //อาหารท้องถิ่น
  LocalDishUserListScreen: undefined;
  LocalDishDetailScreen: { dishId: number };
  LocalDishListScreen: undefined;
  LocalDishFormScreen: { mode: "add" } | { mode: "edit"; dishId: number};
};
